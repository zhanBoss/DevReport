import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Button, Select, Card, Checkbox, InputNumber, Typography, Space, List, Tag, Spin, Empty, App, Row, Col, Statistic, Collapse, DatePicker } from 'antd';
import { SyncOutlined, CopyOutlined, ExportOutlined, PlayCircleOutlined, LoadingOutlined, FileTextOutlined, TeamOutlined, CodeOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useAppStore } from '@/store/useAppStore';
import { getTimeRangeByType, formatDateShort } from '@/utils/time';
import { buildPromptFromStats } from '@/utils/prompt';
import ReactMarkdown from 'react-markdown';
import { REPORT_TYPE_LABELS } from '@/types';
import type { ReportType, GitStats, StreamChunk } from '@/types';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ReportPage = () => {
  const { message } = App.useApp();
  const config = useAppStore(state => state.config);

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [crossDay, setCrossDay] = useState(false);
  const [wordCount, setWordCount] = useState(100);

  const [stats, setStats] = useState<GitStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const streamContentRef = useRef('');

  const projects = config?.projects || [];

  useEffect(() => {
    if (projects.length === 0) return;
    if (selectedProjectIds.length === 0) return;
    const validIds = projects.map(p => p.id);
    const hasValidSelection = selectedProjectIds.some(id => validIds.includes(id));
    if (!hasValidSelection) {
      setSelectedProjectIds([]);
    }
  }, [projects, selectedProjectIds]);

  useEffect(() => {
    const defaults = config?.reports;
    if (defaults) setWordCount(defaults[reportType] || 300);
  }, [reportType, config]);

  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent, isStreaming]);

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));

  const getTimeRange = useCallback(() => {
    if (useCustomRange && customDateRange) {
      return {
        since: customDateRange[0].format('YYYY-MM-DD'),
        until: customDateRange[1].format('YYYY-MM-DD'),
      };
    }
    return getTimeRangeByType(reportType, crossDay);
  }, [useCustomRange, customDateRange, reportType, crossDay]);

  const handleLoadStats = useCallback(async () => {
    if (selectedProjects.length === 0) {
      setStats(null);
      return;
    }
    setLoadingStats(true);
    setStats(null);
    
    try {
      const { since, until } = getTimeRange();
      
      if (selectedProjects.length === 1) {
        const proj = selectedProjects[0];
        const enabledSubs = proj.submodules.filter(s => s.enabled).map(s => s.path);
        const result = await invoke<GitStats>('get_git_stats', {
          path: proj.repo_path, since, until,
          authors: proj.authors, includeSubmodules: enabledSubs,
        });
        setStats(result);
      } else {
        let mergedStats: GitStats = {
          total_commits: 0,
          total_files_changed: 0,
          authors: [],
          date_range: [since, until],
          sample_commits: [],
          file_changes_summary: [],
        };

        for (const proj of selectedProjects) {
          try {
            const enabledSubs = proj.submodules.filter(s => s.enabled).map(s => s.path);
            const result = await invoke<GitStats>('get_git_stats', {
              path: proj.repo_path, since, until,
              authors: proj.authors, includeSubmodules: enabledSubs,
            });
            mergedStats.total_commits += result.total_commits;
            mergedStats.total_files_changed += result.total_files_changed;
            mergedStats.authors = [...new Set([...mergedStats.authors, ...result.authors])];
            mergedStats.sample_commits = [...mergedStats.sample_commits, ...result.sample_commits];
          } catch (projError) {
            console.error(`获取项目 ${proj.name} 统计失败:`, projError);
            message.error(`获取项目 ${proj.name} 统计失败: ${projError}`);
          }
        }

        mergedStats.sample_commits.sort((a, b) => b.date.localeCompare(a.date));
        mergedStats.sample_commits = mergedStats.sample_commits.slice(0, 50);
        setStats(mergedStats);
      }
      
      if (stats && stats.total_commits === 0) {
        message.info('未找到符合条件的提交记录');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      message.error(`获取统计数据失败: ${error}`);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [selectedProjects, getTimeRange, message]);

  useEffect(() => {
    if (selectedProjects.length === 0) {
      setStats(null);
      return;
    }
    
    const timer = setTimeout(() => {
      handleLoadStats();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedProjectIds, reportType, useCustomRange, customDateRange, crossDay]);

  const handleGenerate = async () => {
    if (selectedProjects.length === 0 || !stats || stats.total_commits === 0) return;
    if (!config?.llm.api_key || !config?.llm.base_url || !config?.llm.model) {
      message.warning('请先在设置页配置 LLM 参数');
      return;
    }
    const llm = config.llm;

    setIsStreaming(true);
    setGeneratedContent('');
    streamContentRef.current = '';

    const projectNames = selectedProjects.map(p => p.name).join(' + ');
    const { since, until } = getTimeRange();
    const timeRangeText = useCustomRange ? `${since} 至 ${until}` : `${REPORT_TYPE_LABELS[reportType]}（${since} 至 ${until}）`;
    const prompt = buildPromptFromStats(stats, reportType, wordCount, projectNames, timeRangeText);

    let unlistenFn: (() => void) | null = null;
    const unlisten = await listen<StreamChunk>('llm-stream', (event) => {
      const chunk = event.payload;
      if (chunk.error) {
        setGeneratedContent(prev => prev + `\n\n> 错误: ${chunk.error}`);
        setIsStreaming(false);
        unlistenFn?.();
        return;
      }
      if (chunk.done) {
        setIsStreaming(false);
        unlistenFn?.();
        return;
      }
      streamContentRef.current += chunk.content;
      setGeneratedContent(prev => prev + chunk.content);
    });
    unlistenFn = unlisten;

    try {
      await invoke('stream_llm_request', {
        request: {
          api_key: llm.api_key,
          base_url: llm.base_url,
          model: llm.model,
          prompt,
          temperature: llm.temperature,
          timeout: llm.timeout,
        },
      });
    } catch (error) {
      console.error('生成报告失败:', error);
      message.error(`生成报告失败: ${error}`);
      setIsStreaming(false);
      unlistenFn?.();
    }
  };

  const handleCopy = async () => {
    try {
      await writeText(generatedContent);
      message.success('已复制到剪贴板');
    } catch (e) {
      console.error('复制失败:', e);
    }
  };

  const handleExportMd = async () => {
    try {
      const names = selectedProjects.map(p => p.name).join('+');
      const filePath = await save({
        defaultPath: `${names}-${reportType}-${new Date().toISOString().split('T')[0]}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (filePath) { await writeTextFile(filePath, generatedContent); message.success('导出成功'); }
    } catch (e) { console.error('导出失败:', e); }
  };

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }} className="animate-fadeIn">
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>生成报告</Title>
        <Text type="secondary">基于 Git 提交记录生成工作总结报告，支持多项目合并</Text>
      </div>

      {projects.length === 0 ? (
        <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="请先添加项目">
            <Button type="primary" onClick={() => useAppStore.getState().setCurrentPage('projects')}>前往添加</Button>
          </Empty>
        </Card>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          <div style={{ width: 320, flexShrink: 0, overflow: 'auto' }}>
            <Card size="small" title="选择项目（可多选合并）" style={{ marginBottom: 12 }}>
              <Select
                mode="multiple" 
                style={{ width: '100%' }}
                value={selectedProjectIds}
                onChange={setSelectedProjectIds}
                options={projects.map(p => ({ label: p.name, value: p.id }))}
                placeholder="选择一个或多个项目"
                allowClear
              />
              {selectedProjectIds.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  请选择至少一个项目
                </Text>
              )}
              {selectedProjectIds.length > 1 && (
                <Tag color="blue" style={{ marginTop: 8 }}>
                  合并 {selectedProjectIds.length} 个项目的提交记录
                </Tag>
              )}
            </Card>

            <Card size="small" title="报告配置" style={{ marginBottom: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>报告类型</Text>
                  <Select 
                    value={useCustomRange ? 'custom' : reportType} 
                    onChange={(v) => {
                      if (v === 'custom') {
                        setUseCustomRange(true);
                        setCustomDateRange([dayjs().subtract(7, 'day'), dayjs()]);
                      } else {
                        setUseCustomRange(false);
                        setReportType(v as ReportType);
                      }
                    }}
                    style={{ width: '100%' }}
                    options={[
                      ...Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => ({ 
                        value: v, 
                        label: l
                      })),
                      { value: 'custom', label: '自定义时间' }
                    ]} 
                  />
                  {!useCustomRange && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      时间范围：{getTimeRange().since} 至 {getTimeRange().until}
                    </Text>
                  )}
                </div>

                {useCustomRange && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>自定义时间范围</Text>
                    <RangePicker
                      style={{ width: '100%' }}
                      value={customDateRange}
                      onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                          setCustomDateRange([dates[0], dates[1]]);
                        } else {
                          setCustomDateRange(null);
                        }
                      }}
                      format="YYYY-MM-DD"
                    />
                  </div>
                )}

                <Checkbox 
                  checked={crossDay} 
                  onChange={e => setCrossDay(e.target.checked)}
                >
                  跨天统计（凌晨提交算前一天）
                </Checkbox>

                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>字数限制</Text>
                  <InputNumber value={wordCount} onChange={v => setWordCount(v || 100)} min={50} max={3000} style={{ width: '100%' }} />
                </div>
              </Space>
            </Card>

            <Card size="small" title="提交统计"
              extra={
                <Button 
                  size="small" 
                  icon={<SyncOutlined spin={loadingStats} />} 
                  onClick={handleLoadStats}
                  loading={loadingStats}
                  disabled={selectedProjectIds.length === 0}>
                  刷新
                </Button>
              }
              style={{ marginBottom: 12 }}>
              {loadingStats ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin />
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary">正在统计 Git 提交...</Text>
                  </div>
                </div>
              ) : selectedProjectIds.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先选择项目" />
              ) : !stats ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Statistic title="提交数" value={stats.total_commits} prefix={<FileTextOutlined />} valueStyle={{ fontSize: 18 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="文件数" value={stats.total_files_changed} prefix={<CodeOutlined />} valueStyle={{ fontSize: 18 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="作者数" value={stats.authors.length} prefix={<TeamOutlined />} valueStyle={{ fontSize: 18 }} />
                    </Col>
                  </Row>
                  {stats.sample_commits.length > 0 && (
                    <Collapse size="small" items={[{
                      key: 'samples',
                      label: `抽样预览 (${stats.sample_commits.length} 条)`,
                      children: (
                        <List size="small" dataSource={stats.sample_commits.slice(0, 10)}
                          renderItem={c => (
                            <List.Item style={{ padding: '4px 0' }}>
                              <List.Item.Meta
                                title={<Text style={{ fontSize: 12 }} ellipsis>{c.message}</Text>}
                                description={<Text type="secondary" style={{ fontSize: 11 }}>{c.author} · {formatDateShort(c.date)}</Text>}
                              />
                            </List.Item>
                          )}
                        />
                      )
                    }]} />
                  )}
                </Space>
              )}
            </Card>

            <Button type="primary" block size="large"
              icon={isStreaming ? <LoadingOutlined /> : <PlayCircleOutlined />}
              onClick={handleGenerate}
              disabled={isStreaming || !stats || stats.total_commits === 0}
              loading={isStreaming}>
              {isStreaming ? '生成中...' : '生成报告'}
            </Button>
          </div>

          <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            styles={{ body: { flex: 1, overflow: 'auto', padding: 20 } }}
            title={<>生成结果 {isStreaming && <Tag color="processing">生成中...</Tag>}</>}
            extra={generatedContent && (
              <Space>
                <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>复制</Button>
                <Button size="small" icon={<ExportOutlined />} onClick={handleExportMd}>导出 MD</Button>
              </Space>
            )}>
            <div ref={contentRef} style={{ height: '100%', overflow: 'auto' }}>
              {isStreaming || generatedContent ? (
                <div className="markdown-body">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  {isStreaming && <span className="streaming-cursor">▊</span>}
                </div>
              ) : (
                <Empty description="配置好参数后，点击「生成报告」开始" />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default memo(ReportPage);
