// Public, credential-free status shared by collector and desktop.
const reasons={
 'awaiting-chinese-guide':['排队中，尚未开始整理','项目已可浏览和收藏，后台按批次补齐中文介绍'],
 'daily-budget-exhausted':['今日补全请求预算已用尽','下个UTC日恢复预算后继续处理'],
 'http-429':['限流 / 当日额度不足','等待额度恢复后自动重试'],
 'network-unavailable':['模型网络连接失败','检查网络，稍后自动重试'],
 'http-400':['模型请求参数不兼容','维护者核对模型支持的输出及推理参数'],
 'http-408':['模型请求超时','稍后自动重试'],
 'http-503':['模型服务暂不可用','等待服务恢复后重试'],
 'http-401':['模型密钥无效','维护者需要更新密钥'],
 'http-402':['免费额度不可用','保留免费模式，不切换付费模型'],
 'http-403':['模型访问被拒绝','维护者核对账号及模型权限'],
 'http-404':['模型接口不存在','维护者更新免费模型配置'],
 'free-model-unavailable':['免费模型下架或价格发生变化','已阻止付费调用，等待更换免费模型'],
 'free-model-required':['模型不符合免费要求','已停止调用，维护者检查配置'],
 'missing-api-configuration':['模型服务未配置','维护者配置免费通道'],
 'missing-api-key':['缺少模型密钥','维护者配置密钥'],
 'invalid-response':['模型输出格式异常','稍后重试，当前输出不发布'],
 'insufficient-source':['官方资料不足','等待补充官方资料'],
 'source-review-rejected':['原文依据检查未通过','重新整理，不发布未经核对的内容'],
 'guide-validation-failed':['中文完整性检查未通过','重新整理缺失字段'],
 'guide-completion-failed':['中文补全未完成','稍后自动重试']
};
function explain(code){const pair=reasons[code]||['中文补全暂未完成','等待后台重试'];return {code:reasons[code]?code:'guide-completion-failed',label:pair[0],action:pair[1]};}
function summarize(state,now){const groups={};for(const p of Object.values(state.pending||{})){const r=explain(p.reason);groups[r.code]??={...r,count:0,nextAttemptAt:null};groups[r.code].count++;if(p.nextAttemptAt&&(!groups[r.code].nextAttemptAt||p.nextAttemptAt<groups[r.code].nextAttemptAt))groups[r.code].nextAttemptAt=p.nextAttemptAt;}return {lastCollectedAt:now,pendingCount:Object.keys(state.pending||{}).length,readyCount:Object.keys(state.guides||{}).length,reasons:Object.values(groups)};}
module.exports={explain,summarize};
