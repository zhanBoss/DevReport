import { REPORT_TYPE_LABELS } from '@/types';
import type { GitCommit, GitStats, ReportType } from '@/types';

export const buildPrompt = (
  commits: GitCommit[],
  reportType: ReportType,
  wordCount: number,
  projectName: string
): string => {
  const commitSummary = commits
    .map((c, i) => {
      const files = c.files.map(f => `  ${f.status === 'A' ? '新增' : f.status === 'D' ? '删除' : '修改'} ${f.path}`).join('\n');
      return `${i + 1}. [${c.date}] ${c.author}: ${c.message}\n${files}`;
    })
    .join('\n\n');

  return `你是一个专业的工作总结助手。请根据以下 Git 提交记录，生成一份${REPORT_TYPE_LABELS[reportType]}（${wordCount} 字左右）。

## 项目名称
${projectName}

## Git 提交记录
${commitSummary}

## 要求
- 按模块/功能分类整理
- 突出核心工作内容和成果
- 使用 Markdown 格式输出
- 字数控制在 ${wordCount} 字左右
- 不要罗列每个 commit，而是进行归纳总结
- 如有 bug 修复，说明修复了什么问题
- 如有新功能，描述功能的价值和作用`;
};

export const buildPromptFromStats = (
  stats: GitStats,
  reportType: ReportType,
  wordCount: number,
  projectName: string,
  timeRangeText: string
): string => {
  // 提取主要修改的模块（从文件路径推断）
  const moduleGroups = new Map<string, string[]>();
  stats.sample_commits.forEach(c => {
    c.files.forEach(f => {
      const parts = f.path.split('/');
      const module = parts.length > 1 ? parts[0] : '其他';
      if (!moduleGroups.has(module)) {
        moduleGroups.set(module, []);
      }
      moduleGroups.get(module)!.push(c.message);
    });
  });

  const moduleInfo = Array.from(moduleGroups.entries())
    .map(([module, messages]) => `${module} (${messages.length}次提交)`)
    .slice(0, 5)
    .join(', ');

  const commitList = stats.sample_commits
    .slice(0, 20)
    .map(c => `- ${c.message}`)
    .join('\n');

  // 根据报告类型调整格式
  let formatExample = '';
  let requirements = '';

  if (reportType === 'daily') {
    formatExample = `* 今日工作总结
1. 完成XXX功能开发
2. 修复XXX bug  
3. 优化XXX性能`;
    requirements = `- 简洁直接，每条1句话
- 只列结果，不写过程
- 3-6条即可`;
  } else if (reportType === 'weekly') {
    formatExample = `* 本周工作总结

一、XX项目
1. 功能A：描述完成的内容和解决的问题
2. 功能B：说明实现效果和价值
3. Bug修复：修复了XX问题，提升了XX

二、YY项目  
1. 完成XX模块开发
2. 优化XX性能

本周核心成果
完成了XX功能从0到1的搭建，覆盖XX；通过XX优化，提升了XX。`;
    requirements = `- 按项目分类组织
- 每个功能点简要说明：做了什么、解决了什么、有什么效果
- 如果只有一个项目，可以按功能模块分类
- 可以在最后加"本周核心成果"总结段（可选）`;
  } else {
    formatExample = `按模块/项目分类列出：

一、XX模块
1. 完成XX功能，实现XX效果
2. 优化XX，提升XX%

二、YY模块
1. 新增XX功能
2. 修复XX问题`;
    requirements = `- 按模块或功能分类
- 突出核心工作和成果
- 可以包含数据（完成XX个功能、修复XX个bug）`;
  }

  return `你是工作报告助手，请根据Git提交记录生成${REPORT_TYPE_LABELS[reportType]}。

项目：${projectName}
时间：${timeRangeText}
提交数：${stats.total_commits}条
主要模块：${moduleInfo}

提交记录（抽样）：
${commitList}

参考格式：
${formatExample}

要求：
${requirements}
- 总字数${wordCount}字左右
- 合并相似提交，提炼关键信息
- 不要逐条翻译commit，要归纳总结
- 如果一个功能有多次提交，只写一条
- 强调结果、影响、价值，而非过程

注意：实际有${stats.total_commits}条提交，以上仅为抽样。`;
};
