const {sourceHash,SOURCE_FIELDS}=require('../../electron/engine/github-hot-admission');
// Synthetic verified content used only by isolated tests, never included in real catalog data.
function complete(item,now='2026-10-18T00:00:00Z'){
 const base={...item,readmeExcerpt:item.readmeExcerpt||'Fixture documentation: install the sample drawing library, load one vector drawing, and compare the editable output with the reference.'};
 const quote=base.description?.length>=12?base.description:base.readmeExcerpt,hash=sourceHash(base);
 return {...base,summary:'这是隔离测试使用的绘图处理开发库，用于把示例矢量图转换成可编辑结果并核对输出。',scenarios:['在测试工程中转换一个示例矢量图，检查独立图层和文字。'],usage:'将测试矢量图转换为可编辑的图层内容并核对结果。',requirements:'准备测试文档指定的开发环境和一个示例矢量图。',quickStart:'安装测试绘图开发库并运行示例。',guide:{version:2,language:'zh-CN',kind:'开发库',purpose:'将测试矢量图转换为可编辑的图层内容并核对结果。',audience:'希望在代码中集成绘图处理能力的开发者。',example:'在测试工程中转换一个示例矢量图，检查独立图层和文字。',steps:['按测试文档安装绘图开发库并打开最小示例。','载入示例矢量图，转换后查看输出图层。'],verification:'对照测试参考图检查图层数量、文字和几何形状是否一致。',sourceHash:hash,sourceUrl:base.readmeUrl,curated:true,basis:'仅用于隔离测试的合成导读。',evidence:SOURCE_FIELDS.map(field=>({field,quote})),review:{approved:true,sourceHash:hash,checkedAt:now}}};
}
module.exports={complete};
