var rpa = ____rpaName____;
var instructScript = {
//全局变量
globalVar: {},
mainFlow: async function () {
//本地变量列表
var localVar = {};
//注入 bootScript.js 文件到执行指令环境 
await window.rpaVue.feedbackTrack(1, 4, 6, localVar, this.globalVar, 'mainFlow流程 执行第 2 条指令【注入脚本文件】');
await rpa.injectionJs(`bootScript.js`, -1);
//自定义代码片段 适合场景：手动修改脚本后将代码到指定位置、注入脚本执行方法 
await window.rpaVue.feedbackTrack(2, 4, 7, localVar, this.globalVar, 'mainFlow流程 执行第 3 条指令【Javascript片段】');
instructScript.globalVar.isDebug=false;  await bootScript.start('订单私信');       //邀约 私信 订单私信

await window.rpaVue.feedback('mainFlow流程 执行结束');
await window.rpaVue.executeEnd();
},
onInvite: async function (json) {
//本地变量列表
var localVar = {json};
await rpa.writeRunLog('获取到邀约配置：', JSON.parse(json));
await rpa.wake("waitCreateInvite");
//自定义代码片段 适合场景：手动修改脚本后将代码到指定位置、注入脚本执行方法 
appScriptBoot.start(JSON.parse(json));
}
};
window.rpaVue.setAppName('测试抖店');
console.info('指令脚本加载完成');