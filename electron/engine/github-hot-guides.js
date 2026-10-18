// Presentation enrichment never mutates the persisted feed or favorite snapshots.
const profiles=require('../../catalog/github-hot-profiles.json');
const types={
 learn:['学习教程','希望系统学习、练习或准备面试的人','按 README 的目录选择一个章节或练习','完成一个练习，并对照参考实现或课程要求检查'],
 list:['资源目录','希望比较工具、查找资料和学习入口的人','按 README 的用途分类选择一项资源，再打开该资源的官方页面','确认选中的资源能解决你的具体问题；目录本身不执行任务'],
 app:['应用软件','希望通过现成软件完成任务的用户','从 README 或官网确认支持平台，选择官方安装包或在线入口','用一个小任务核对功能与结果，再处理正式资料'],
 self:['自部署服务','愿意部署、配置和维护应用的用户或团队','先核对官方部署方式、环境及配置，再启动最小实例','完成一次登录或最小操作，检查服务及数据保存正常'],
 lib:['开发库','需要把能力接入自己代码的开发者','在官方支持的语言环境中，按快速开始安装依赖并运行最小代码示例','比较示例输入和输出，再接入自己的工程'],
 framework:['开发框架','需要构建应用、网站或服务的开发者','按官方快速开始创建最小工程，配置所需依赖','启动示例并验证一个最小功能，再扩展业务'],
 cli:['命令行工具','愿意使用终端或脚本完成任务的用户','按官方说明安装，先阅读帮助及最小示例再执行','先用小样本或测试目录核对输出，再用于正式文件'],
 agent:['AI 助手 / 智能体','愿意配置模型、工具和运行环境的用户或开发者','按官方说明配置模型、工具或渠道，先运行权限受限的小任务','检查实际输出及工具执行记录，确认符合任务要求'],
 model:['模型 / 推理项目','需要运行或集成模型的开发者和研究者','核对模型许可、硬件和依赖，按官方样例准备模型或权重','用官方样例核对推理输出，再用自己的样本评估效果'],
 skill:['AI 指令 / Skill 资源','使用相应 AI 宿主、希望复用指令与工作方式的用户','先确认适配的宿主，按 README 选择并保留所需指令及关联文件','在宿主中完成一个样例任务，确认调用方式及实际结果'],
 source:['源码 / 系统实现','希望阅读、研究或参与开发的技术用户','先阅读架构、开发环境和构建说明；需要使用成品时找官方发布入口','复现一个官方示例或测试，确认理解对应实现'],
 standard:['标准 / 协议','需要实现兼容工具或理解技术约定的开发者','先阅读规范、术语及参考实现，确认适用版本','按规范示例核对数据或交互，检查兼容性'],
 research:['研究 / 实验项目','希望复现实验、评估技术的研究者和开发者','先阅读方法、数据、依赖及实验说明，复现最小样例','比较实验设置和基准结果；实验效果需自行验证'],
 community:['社区 / 讨论仓库','希望查阅经验、讨论和参与社区的人','从 README、讨论区或议题目录找到对应话题','核对信息时间、上下文与原始出处，再决定是否采用'],
 font:['字体 / 图标资源','需要为界面和视觉作品选取字体或图标的设计师与开发者','先查看预览、字符或图标覆盖及许可，再按说明安装或接入','在目标尺寸、语言及主题下预览并检查可读性'],
 unknown:['开源项目','请结合下方官方说明判断是否适合你的任务','打开官方 README，先确认项目形态及适用场景','按官方样例检查实际结果；缺少说明时先查阅官方文档']
};
function infer(item){
 const text=[item.description,...(item.topics||[])].join(' ').toLowerCase();
 if(/\b(awesome|curated list|collection of.*resources)\b/.test(text))return 'list';
 if(/\b(tutorials?|curriculum|courses?|learning resources)\b/.test(text))return 'learn';
 if(/\b(command.line tool|cli tool)\b/.test(text))return 'cli';
 if(/\b(framework)\b/.test(text))return 'framework';
 if(/\b(library)\b/.test(text))return 'lib';
 return 'unknown';
}
function sourceSummary(item){
 const description=(item.description||'').trim();
 if(description)return description.slice(0,1200);
 const paragraph=(item.readmeExcerpt||'').split(/\n\s*\n/).map(s=>s.replace(/\[[^\]]*\]\([^)]*\)/g,m=>m.slice(1,m.indexOf(']'))).replace(/\s+/g,' ').trim()).find(s=>s.length>65&&!/^(#|!|\[|```|<|https?:)/.test(s)&&!/^.{0,30}(badge|sponsor|shields\.io)/i.test(s));
 return paragraph?paragraph.slice(0,1100):'官方简介与 README 暂未提供足够的用途说明，请打开原文了解后再决定是否使用。';
}
function enrich(item){
 if(item.guide?.version>=1)return item;
 const profile=profiles[item.id],key=profile?.kind||infer(item),type=types[key]||types.unknown;
 const summary=profile?.summary||sourceSummary(item);
 const example=profile?.example||'';
 const guide={version:1,kind:type[0],audience:type[1],example,steps:[type[2],type[3]],basis:profile?'依据官方简介与 README 整理的中文导读；场景为理解用途的示例。':'直接展示官方简介或 README 摘录；尚未编写专属中文导读。',curated:!!profile};
 const requirements=key==='list'||key==='learn'||key==='community'?'可先阅读资料；链接中的软件、课程或服务有各自的环境、账号和许可要求。':key==='agent'||key==='model'?'按原文核对模型来源、运行环境、硬件、账号或 API Key；外部服务费用与权限由对应服务决定。':'支持平台、依赖版本、账号、部署方式及许可，以该项目的官方说明为准。';
 return {...item,summary,guide,scenarios:example?[example]:[summary.slice(0,600)],usage:type[2],requirements,quickStart:guide.steps.map((s,i)=>(i+1)+'. '+s+'。').join('\n'),editorialStatus:profile?'项目专属中文导读':'官方原文导读'};
}
module.exports={enrich,types,sourceSummary};
