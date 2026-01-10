//封装一些rpa常用操功能 发布正式需要注意：先提交git推送线上防止丢代码 然后用混淆所有js不影响功能 在线工具：https://www.bejson.com/encrypt/jsobfuscate/#google_vignette
var ____rpaName____ = {
    //是不是debug模式
    debug: ____debug____,
    //注册的内置方法 页面加载完成运行时赋值
    rpaApi: null,
    //是否已停止执行 为true后所有循环等待都停止
    stop: false,

    log() {
        if (this.debug) {
            console.log.apply(null, arguments);
        }
    },
    info() {
        if (this.debug) {
            console.info.apply(null, arguments);
        }
    },
    warn() {
        if (this.debug) {
            console.warn.apply(null, arguments);
        }
    },
    error() {
        if (this.debug) {
            console.error.apply(null, arguments);
        }
    },


    /**
     * 点击元素 会等待5秒元素出现 如果需要等待更长时间就使用等待指令
     * @param {any} elName 元素库保存的元素名
     * @param {any} useWinApi 使用真实鼠标 默认false
     * @param {any} useChildPoup 使用父子弹窗 默认false
     * @param {any} index 如果要循环点击多个元素在此传入第几个匹配元素即可 注意0表示第一个元素 默认-1 表示点击单个元素如出现多个元素则抛异常
     */
    async click(elName, useWinApi = false, useChildPoup = false, index = -1) {
        //等待元素出现
        var elItems = [];
        for (var i = 0; i < 5 * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            elItems = await this.getElement(elName);
            if (elItems.length > 0) {
                break;
            }
        }
        //var elItems = await this.getElement(elName);
        if (elItems.length == 0) {
            throw `未找到元素：${elName} 页面可能发生变动请在元素库重新捕获元素`;
        }
        if (elItems.length > 1 && index == -1) {
            throw "发现多个元素 页面可能发生变动请在元素库重新捕获元素";
        }
        if (index != -1 && index >= elItems.length && index < 0) {
            throw `index 参数不合法 发现${elItems.length}个元素 传入的index参数应该在 0~${elItems.length - 1} 之间`;
        }

        if (useWinApi) {
            await this.focusChromeForm(false);
        }
        var el = elItems[0];
        if (index > -1) {
            el = elItems[index];
        }
        //不在视图区域则尝试移动
        var visible = this.elementMoveVisible(el, "center", true);
        if (visible) {
            //可见直接点
            await this.clickCEF(el, useWinApi, useChildPoup);
        }
        else {
            //不一定存在可视区域 等出现
            var r = await this.waitElementVisible(el, 5);
            if (r) {
                await this.clickCEF(el, useWinApi, useChildPoup);
            }
            else {
                throw "等待5秒元素一直不可见 无法点击";
            }
        }
    },
    /**
     * 获取元素文本 返回数组每个元素是个对象包含 会等待5秒元素出现 如果需要等待更长时间就使用等待指令
     * @param {any} elName 元素库保存的元素名
     * @param {any} getFirstInnerText 只取第一个元素的innerText 直接返回个字符串
     * @returns 返回匹配的所有元素 innerHTML、textContent、innerText、value
     */
    async getText(elName, getFirstInnerText = true) {
        //等待元素出现
        var elItems = [];
        for (var i = 0; i < 5 * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            elItems = await this.getElement(elName);
            if (elItems.length > 0) {
                break;
            }
        }

        var result = [];
        try {
            //await this.sleep(200);
            //var elItems = await this.getElement(elName);
            if (elItems.length == 0) {
                throw "未找到元素 页面可能发生变动请重新捕获元素 此指令会等待5秒元素出现 如果需要等待更长时间请使用等待指令";
            }
            for (var i = 0; i < elItems.length; i++) {
                var el = elItems[i];
                var obj = {};
                if (el.innerHTML) {
                    obj.innerHTML = el.innerHTML;
                }
                if (el.textContent) {
                    obj.textContent = el.textContent;
                }
                if (el.innerText) {
                    if (getFirstInnerText) {
                        return el.innerText;
                    }
                    obj.innerText = el.innerText;
                }
                if (el.value) {
                    obj.value = el.value;
                }

                //读取其他属性
                for (var j = 0; j < el.attributes.length; j++) {
                    var attr = el.attributes[j];
                    /*console.info("读取自定义属性：", attr);*/
                    if (attr.value && attr.name) {
                        obj[attr.name] = attr.value;
                    }
                }

                result.push(obj);
            }
        } catch (e) {

        }
        return result;
    },
    /**
     * 输入文本
     * @param {any} elName 元素库保存的元素名
     * @param {any} content 字符串型文本内容
     * @param {any} useWinApi 是否使用winApi模拟键盘输入 支持调速度
     * @param {any} speed 输入速度1到100越大越快
     */
    async setText(elName, content, useWinApi = false, speed = 50) {
        if (useWinApi) {

            if (speed > 100) {
                throw "速度范围是1到100";
            }
            if (speed < 1) {
                throw "速度范围是1到100";
            }

            await this.focusChromeForm(useWinApi);
            await this.click(elName, true);
            await this.sleep(50);
            await this.rpaApi.inputText(content, speed);
        }
        else {
            if (await this.waitInDoc(elName)) {
                var el = (await this.getElement(elName))[0];
                if (el) {
                    this.elementMoveVisible(el, "center", true);
                    this.inputText(el, content);
                }
            } else {
                throw "未匹配到元素：" + elName;
            }
        }
    },
    /**
     * 等待元素出现在文档中
     * @param {any} elName 元素库保存的元素名
     * @param {any} waitSecond 等待秒数 默认20秒
     * @param {any} throwEx 不存在是否抛出异常 默认true  检测元素是否存在传false
     * @returns 返回true 等到元素出现了
     */
    async waitInDoc(elName, waitSecond = 20, throwEx = true) {
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            var elItems = await this.getElement(elName);
            if (elItems.length > 0) {
                return true;
                //return elItems[0];
            }
        }
        if (throwEx) {
            throw `等待元素 ${elName} 出现在文档中超时`;
        } else {
            return false
        }
    },
    /**
     * 等待元素出现在可视区域中
     * @param {any} elName 元素库保存的元素名
     * @param {any} waitSecond 等待秒数 默认20秒
     * @returns 返回第一个匹配到的可见元素 没有则返回null
     */
    async waitVisible(elName, waitSecond = 20) {
        var elItems = [];
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            elItems = await this.getElement(elName);
            if (elItems.length > 0) {
                break;
            }
        }
        for (var i = 0; i < elItems.length; i++) {
            var el = elItems[i];
            var r = await this.waitElementVisible(el);
            if (r) {
                return true;
                //return el;
            }
        }

        throw `等待元素 ${elName} 出现在可视区域中超时`;
        //return null;
    },
    /**
     * 鼠标悬停在元素上
     * @param {any} elName 元素库保存的元素名 
     * @returns 返回第一个匹配到的元素 没有则返回null
     */
    async hover(elName, useWinApi = false) {
        var el = await this.waitVisible(elName);
        if (el) {
            if (useWinApi) {
                await this.focusChromeForm(useWinApi);
            }
            await this.hoverCEF(el, useWinApi);
        }
        await this.sleep(200);
    },

    /**
     * 鼠标滚轮
     * @param {any} x 鼠标相对页面左上角横坐标
     * @param {any} y 鼠标相对页面左上角竖坐标
     * @param {any} deltaY 鼠标垂直方向移动量 负值是鼠标往下滚即页面上移
     * @param {any} useWinApi 是否使用真实鼠标操作
     */
    async wheel(x, y, deltaY, useWinApi = false) {
        if (useWinApi) {
            await this.focusChromeForm(useWinApi);
        }
        await this.rpaApi.mouseWheel(x, y, deltaY, useWinApi);
    },


    /**
     * 等待任务完成 填任务名支持异步同时等待
     * @param {any} waitSecond 等待秒数 默认5秒 
     * @param {any} taskName 任务名 唯一即可
     */
    async wait(waitSecond = 5, taskName = null) {
        if (taskName) {
            await this.waitSleepAsync(taskName, 1000 * waitSecond);
        }
        else {
            //await this.sleep(1000 * waitSecond);
            await this.waitSleep(1000 * waitSecond)
        }
    },
    /**
     * 确认任务完成 填任务名支持异步同时等待
     * @param {any} taskName 任务名 唯一即可
     */
    async wake(taskName = null) {
        if (taskName) {
            await this.wakeSleepAsync(taskName);
        }
        else {
            await this.wakeSleep()
        }
    },
    /**
     * 从元素库获取元素并抓取 并在调用的dom中抓取 返回抓取到的元素集合
     * @param {any} elName 元素库保存的元素名
     * @returns
     */
    async getElement(elName) {
        var resp = JSON.parse(await this.rpaApi.getSelector(elName));
        if (!resp.ok) {
            throw `未找到元素：${elName}`;
        }
        var evalJs = resp.body;
        var evalResult = eval(`(` + evalJs + `)();`);
        var elements = [];
        if (evalResult) {
            if (evalResult.constructor.name === "NodeList" || evalResult.constructor.name === "Array") {
                evalResult.forEach(function (item) {
                    elements.push(item);
                });
            }
            else {
                elements.push(evalResult);
            }
        }
        return elements;
    },


    /**
    * 打开web页面 返回页面id
    * @param {any} url 为空打开空白页
    * @param {any} focusChromeForm 是否激活浏览器窗体 默认false
    * @param {any} waitLoad 是否等待页面加载完成 默认true
    * @returns
    */
    async openPage(url, focusChromeForm = false, waitLoad = true) {
        if (focusChromeForm) {
            await this.focusChromeForm(false);
        }
        var id = await this.rpaApi.addTabPage(url);
        //最多等待20秒
        if (waitLoad) {
            for (var i = 0; i < 40; i++) {
                if (this.stop) { break; }
                await this.sleep(500);
                if (await this.rpaApi.getCurrPageRpaStatus() == 1) {
                    break;
                }
            }
        }
        return id;
    },
    /**
     * 在当前页面打开子弹窗 并把窗口引用保存到指定变量 以window.open方式打开可以父子窗口互相通信
     * @param {*} saveVarName 保存到rpa对象内的变量名称 以childPoup_开头 默认win1
     * @param {*} url 打开的url
     * @param {*} name 默认_blank
     * @param {*} specs 
     * @param {*} waitLoad 是否等待页面加载完成 默认true
     * @returns 
     */
    async openPoupPage(saveVarName = "win1", url, name = '_blank', specs = '', waitLoad = true) {
        var tabWindow = window.open(url, name, specs);
        await this.sleep(500);
        //最多等待20秒
        if (waitLoad) {
            for (var i = 0; i < 40; i++) {
                if (this.stop) { break; }
                await this.sleep(500);
                if (await this.rpaApi.getCurrPageRpaStatus() == 1) {
                    break;
                }
            }
        }
        if (tabWindow) {
            this["childPoup_" + saveVarName] = tabWindow;
            return true;
        }
        return false;
    },
    /**
     * 向子弹窗发送消息 win1.postMessage(jsonMsg, '*');
     * @param {any} saveVarName 打开是设置的变量名 如win1
     * @param {any} jsonMsg 这里传的啥子弹窗接受到就是啥 在子弹窗参数event.data就是一个序列化后的对象 例如 window.addEventListener('message', function (event) { console.log('收到消息', event.data) });
     * @returns
     */
    async sendMsgChildPoup(saveVarName = "win1", jsonMsg = null, isJson = true) {
        var childPoup = this["childPoup_" + saveVarName];
        if (!childPoup) {
            throw '未找到变量名：' + saveVarName;
        }
        if (isJson) {
            childPoup.postMessage(JSON.parse(jsonMsg), '*');
        }
        else {
            childPoup.postMessage(jsonMsg, '*');
        }
        return true;
    },
    /**
     * 获取多标签页配置信息 返回对象 失败返回null
     * @param {any} keyword 网页url或标题关键字 取不变的部分 不传则获取当前打开的页面
     * @param {any} waitSecond 等待加载完成秒数
     */
    async getPage(keyword = null, waitSecond = 10) {
        var id = -1;

        if (keyword) {
            for (var i = 0; i < waitSecond * 2; i++) {
                if (this.stop) { break; }
                await this.sleep(100);
                try {
                    var id = await this.rpaApi.getWebPageId(keyword);
                    if (id != -1) {
                        break;
                    }
                } catch (e) {

                }
            }
            //传了keyword未匹配到返回null
            if (id == -1) {
                return null;
            }
        }
        //await this.sleep(500);
        //取页面详情 id=-1会返回当前页面信息
        var resp = JSON.parse(await this.rpaApi.getTabPage(id));
        if (resp.ok) {
            return resp.body;
        }
        return null;
    },
    /**
     * 获取多标签页id 返回页面id 未匹配到则抛出异常
     * @param {any} keyword 网页url或标题关键字 取不变的部分 不传则获取当前打开的页面
     * @param {any} waitSecond 等待加载完成秒数
     */
    async getPageId(keyword, waitSecond = 20) {
        var id = -1;
        await this.sleep(100);
        //if (keyword) {
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            try {
                id = await this.rpaApi.getWebPageId(keyword, true);
                if (id != -1) {
                    break;
                }
            } catch (e) {

            }
        }
        //超时未取到 则忽略已加载完成的
        if (id == -1) {
            id = await this.rpaApi.getWebPageId(keyword);
        }

        //指定关键字未取到则抛出异常
        if (id == -1) {
            throw `未匹配到关键字：${keyword} 的页面`;
        }

        return id;

        //}
        ////await this.sleep(500);
        ////取页面详情 id=-1也就是关键字为空取当前页面
        //var resp = JSON.parse(await this.rpaApi.getTabPage(id));
        //if (resp.ok) {
        //    return resp.body.id;
        //}
        /*    return null;*/
    },
    /**
    * 刷新页面 返回页面id
    * @param {any} keyword url关键字 为空刷新当前激活的页面
    * @param {any} showConfirm 是否显示弹窗 默认true 设置false可以拦截弹窗
    * @returns
    */
    async refPage(keyword = null, showConfirm = true) {
        var tab = this.getPageId(keyword);
        if (tab) {
            var id = await this.rpaApi.refreshTabPage(tab.id, showConfirm);
            await this.sleep(500);
            return id;
        }
        return null;
    },
    /**
     * 刷新页面
     * @param {any} tabId 页面id
     * @param {any} showConfirm 是否显示弹窗 默认true 设置false可以拦截弹窗
     */
    async refPageId(tabId, showConfirm = true) {
        await this.rpaApi.refreshTabPage(tabId, showConfirm);
        await this.sleep(500);
    },
    /**
    * 关闭页面
    * @param {any} id 页面id
    * @param {any} showConfirm 是否显示弹窗 默认true 设置false可以拦截弹窗
    * @returns
    */
    async closePage(id, showConfirm = true) {
        await this.rpaApi.closeTabPage(id, showConfirm);
        await this.sleep(500);
    },
    /**
    * 激活页面
    * @param {any} id 页面id
    * @param {any} focusChromeForm 是否激活浏览器窗体 默认false
    * @returns
    */
    async activePage(id, focusChromeForm = false) {
        if (focusChromeForm) {
            await this.focusChromeForm(false);
        }
        await this.rpaApi.selectTabPage(id);
        await this.sleep(500);
    },

    /**
     * 等待指定tab窗口关闭
     * @param {any} tabId 窗口id 就是网页id
     */
    async waitPageClose(tabId, waitSecond = 10) {
        await this.waitSleepAsync("webPage_" + tabId, waitSecond * 1000);
        //this.sleepData.tabId = tabId;
        //await this.waitSleep(0);
    },
    /**
     * 指定tab窗口关闭后唤醒当前流程 此方法可能不需要开发者调用
     * @param {any} tabId 窗口id
     */
    wakePage(tabId) {
        this.wakeSleepAsync("webPage_" + tabId);
        //if (tabId == this.sleepData.tabId) {
        //    this.wakeSleep();
        //}
    },

    /**
     * 在指定web页面执行任意方法 支持传入json参数 获取返回参数 会等待页面加载完成再执行
     * @param {any} id 页面id
     * @param {any} funcName js方法名 window.xxxxx 不管是不是异步方法都不需要带await
     * @param {any} waitSecond 执行等待超时秒数
     * @param {any} jsonParam json参数
     * @returns
     */
    async callPageJS(id, funcName, waitSecond = 200, jsonParam = null) {
        if (id < 0) {
            throw '页面id必填 必须大于等于0';
        }
        if (!funcName) {
            throw 'rpa方法名必填';
        }
        var resp = JSON.parse(await this.rpaApi.callPageJS.apply(this, arguments));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     * 在指定页面执行rpa方法 前面两个参数必填 注意后面参数是传入调用rpa方法的 会等待页面加载完成再执行
     * @param {any} id 页面id
     * @param {any} rpaFuncName rpa方法名 必须是rpa对象内方法
     * @returns
     */
    async callPageRpa(id, rpaFuncName) {
        if (id < 0) {
            throw '页面id必填 必须大于等于0';
        }
        if (!rpaFuncName) {
            throw 'rpa方法名必填';
        }
        //返回null都是成功
        var json = await this.rpaApi.callPageRpa.apply(this, arguments);
        if (json) {
            var resp = JSON.parse(json);
            if (resp.ok) {
                return resp.body;
            }
            else {
                throw resp.message;
            }
        }
        return null;
    },

    /**
     * 注册请求监控数据 修改请求监控到的数据是不准的 经服务器测试收到数据正确的
     * @param {any} id 页面id
     * @param {any} keyword 监控匹配url关键字
     * @param {any} callbackName 回调的方法名如window.xxxx 默认window.onRequestMonitor 如果不以window开头则调用window.instructScript.你的callbackName
     * @param {any} modifyPost 请求Body对象 默认null不修改请求 原请求有body才会修改 如 { id: 1 }
     * @param {any} modifyUrlParam 修改请求url参数对象 不设置相关字段不修改请求如{"url": "newUrl", "method": "get", "urlKV": { "id": 1 }, "headeKV": { "token": "newToken" }}
     * @param {any} cancelRequest 是否拦截取消请求 默认false 设置respData则无需设置此项
     * @param {any} respData 自定义响应 配置后会拦截请求 如{ id: 1, name: "qwer"}
     * @returns
     */
    async regReqMon(id, keyword, callbackName = null, modifyPost = null, modifyUrlParam = null, cancelRequest = false, respData = null) {
        if (!callbackName) {
            callbackName = "window.onRequestMonitor"
        }
        var modifyPostJson = null;
        var modifyGetJson = null;
        var respDataJson = null;
        if (modifyPost) {
            modifyPostJson = JSON.stringify(modifyPost)
        }
        if (modifyUrlParam) {
            modifyGetJson = JSON.stringify(modifyUrlParam)
        }
        if (respData) {
            respDataJson = JSON.stringify(respData)
        }

        return await this.rpaApi.registerRequestMonitor2(
            id,
            keyword,
            callbackName,
            modifyPostJson,
            modifyGetJson,
            cancelRequest,
            respDataJson
        );
    },
    /**
    * 取消请求监控数据
    * @param {any} id 页面id
    * @param {any} keyword 监控url关键字
    * @returns
    */
    async cancelReqMon(id, keyword) {
        return await this.rpaApi.cancelRequestMonitor(id, keyword,);
    },
    /**
     * fetch请求 返回null失败 protobuf请求body需要Array.from()转换为数组
     * @param {string} url 完整url
     * @param {object} data 类型json字符串 请求相关数据 包含字段method、headers、body 
     * @param {string} contentType 请求类型，如 'json'只取响应json字符串, 'text', 'blob', 'protobuf', 'jsonHeader'包含响应头
     */
    async fetchAsync(url, data = null, contentType = 'json') {
        try {
            let reqData = JSON.parse(data);
            if (contentType == 'protobuf' && reqData.body) {
                reqData.body = new Uint8Array(reqData.body);
            }
            const resp = await fetch(url, reqData);
            //if (!resp) {
            //    console.log('fetchAsync失败可能网络不稳定')
            //}
            if (!resp || resp.status === 204 || resp.status === 205) {
                return null;
            }
            if (resp.ok) {
                var resHeader = {};
                resp.headers.forEach((value, key) => {
                    resHeader[key] = value;
                });
                switch (contentType) {
                    case 'json':
                        try {
                            var resJson = await resp.json();
                            if (resJson) {
                                return JSON.stringify(resJson);
                            }
                        } catch (error) {
                            throw new Error(`解析响应 JSON 数据出错 消息：${error} url：${url}`);
                        }
                    case 'jsonHeader':
                        try {
                            var resJson = await resp.json();
                            if (resJson) {
                                return JSON.stringify({ body: resJson, header: resHeader });
                            }
                        } catch (error) {
                            throw new Error(`解析响应 JSON 数据出错 消息：${error} url：${url}`);
                        }
                    case 'text':
                        return await resp.text();
                    case 'blob':
                        return await resp.blob();
                    case 'protobuf':
                        var resProtobuf = Array.from(new Uint8Array(await resp.arrayBuffer()));
                        if (resProtobuf) {
                            //console.log(`响应数据：`, resProtobuf);
                            return JSON.stringify(resProtobuf);
                        }
                    default:
                        throw new Error(`不支持的响应类型: ${contentType}`);
                }
            }
            return null;
        } catch (error) {
            console.error(`请求出错 消息：${error} url：${url}`);
        }
        return null;
    },

    /**
     * 打开选择文件弹窗
     * @param {any} nameExt 文件扩展名如"Excel文件|*.xlsx|Excel(97-2003)文件|*.xls"
     * @param {any} defDir 默认位置设置null则不限制
     * @returns 返回{ fileName, parentPath, fullPath}
     */
    async openFileDialog(nameExt, defDir = null) {
        var resp = JSON.parse(await this.rpaApi.openFileDialog(nameExt, defDir));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     * 打开excel文件
     * @param {any} fileName 
     * @param {any} sheetName 不填默认第一个
     * @returns
     */
    async openExcel(fileName, sheetName = "") {
        var resp = JSON.parse(await this.rpaApi.openExcel(fileName, sheetName));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
    * 获取excel指定行列值 行列是excel软件显示的行和列 如1,A
     * @param {any} id 打开文件返回的id
     * @param {any} rowNum 行号 excel软件显示的行号 注意从1开始
     * @param {any} colNum 列号 excel软件显示的字母从A开始 AA是27列 优先匹配第一行的列名若匹配不到则用ABCD
     * @returns 返回null可能已经到底
     */
    async getCellValue(id, rowNum, colNum) {
        var resp = JSON.parse(await this.rpaApi.getCellValue(id, rowNum, colNum));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     * 读指定列所有行 读到null停止
     * @param {any} id 打开文件返回的id
     * @param {any} colNum 列号 excel软件显示的字母从A开始 AA是27列 优先匹配第一行的列名若匹配不到则用ABCD
     * @returns
     */
    async getAllRowValue(id, colNum) {
        let items = []
        try {
            let rowNum = 1
            let rowVal = null
            do {
                rowVal = await rpa.getCellValue(id, rowNum, colNum)
                rowNum++
                if (rowVal) {
                    items.push(rowVal)
                }
            } while (rowVal);
        } catch (e) {

        }
        return items
    },
    /**
     * 设置excel指定行列值 行列是excel软件显示的行和列 如1,A
     * @param {any} id
     * @param {any} rowNum
     * @param {any} colNum
     * @param {any} value
     * @returns
     */
    async setCellValue(id, rowNum, colNum, value) {
        var resp = JSON.parse(await this.rpaApi.setCellValue(id, rowNum, colNum, value));
        if (!resp.ok) {
            throw resp.message;
        }
        //return resp.body;
    },
    /**
     * 关闭excel文件
     * @param {any} id
     * @returns
     */
    async closeExcel(id) {
        var resp = JSON.parse(await this.rpaApi.closeExcel(id));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },

    /**
     * 注入js文件 
     * @param {any} scriptName 脚本名称如xxx.js 如果以http开头则从云端加载脚本
     * @param {any} id 页面id 默认-1是运行环境
     * @param {any} refreshInject 页面刷新后再次注入脚本 默认true
     * @returns
     */
    async injectionJs(scriptName, id = -1, refreshInject = true) {
        var resp = JSON.parse(await this.rpaApi.injectionJs(scriptName, id, refreshInject));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.message;
    },

    /**
     * 显示配置弹窗 等待弹窗关闭方法才返回配置结果
     * @param {any} htmlName
     * @param {any} jsonAppConfig 传给弹窗json字符串 在弹窗调window.rpaVue.updateData这个方法传入参数
     * @param {any} width               宽度 
     * @param {any} height              高度 尺寸同时设置0最大化
     * @param {any} left                   左侧距离设置-1居中
     * @param {any} top                   顶部距离设置-1居中
     * @param {any} topMost           是否最前显示默认false
     * @param {any} waitLoadSecoend 等待弹窗页面加载完成传入参数秒数
     * @returns 弹窗提交的json字符串
     */
    async showDialogForm(htmlName, jsonAppConfig = null, width = 1000, height = 700, left = -1, top = -1, topMost = false, waitLoadSecoend = 1) {
        if (window.rpaVue && window.rpaVue.canClose) {
            window.rpaVue.canClose = false;
        }
        var resp = JSON.parse(await this.rpaApi.showDialogForm(htmlName, jsonAppConfig, width, height, left, top, topMost, waitLoadSecoend));

        if (window.rpaVue) {
            window.rpaVue.canClose = true;
        }

        if (!resp.ok) {
            throw resp.message;
        }

        return JSON.parse(resp.body);
    },

    /**
     * 调用弹窗页面JS方法 一般用于调用运行配置弹窗页面方法传入数据
     * @param {any} funcName 方法名 window.rpaVue.xxxx
     * @param {any} jsonParam 字符串参数 可用json序列化
     * @returns
     */
    async callJsDialogForm(funcName, jsonParam) {
        await this.rpaApi.callJsDialogForm(funcName, jsonParam)
    },
    /**
     * 获取当前运行的app信息 字段.RunParameter是应用运行参数
     * @returns
     */
    async getAppInfo() {
        var resp = JSON.parse(await this.rpaApi.getAppInfo());
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     * 保存运行应用运行参数 可实现应用运行参数存储下次复用
     * @param {any} param js对象
     * @returns
     */
    async saveAppParameter(param) {
        var resp = JSON.parse(await this.rpaApi.saveAppParameter(JSON.stringify(param)));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },

    /** 
     * 记录运行日志 参数和console.log一样
     * @returns
     */
    async writeRunLog() {
        if (arguments.length == 0) {
            console.error("打印日志必须有1个及以上参数");
            return;
        }
        console.log(...arguments);

        //let content = '打印日志：';
        let content = '';
        for (let i = 0; i < arguments.length; i++) {
            const arg = arguments[i];
            if (typeof arg === 'object' && arg !== null) {
                content += JSON.stringify(arg);
            } else {
                content += String(arg);
            }
            //不是最后一个加换行
            if (i < arguments.length - 1) {
                content += "\r\n";
            }
        }

        //记录日志 
        await this.rpaApi.writeRunLog(content);
    },
    //启用这个runMessage时同时记录到运行日志
    runMessageWriteRunLog: false,
    /** 
    * 在运行窗口显示消息 可配置记录到文件默认不记录到文件 参数和console.log一样 
    * @returns
    */
    async runMessage() {
        if (arguments.length == 0) {
            console.error("打印日志必须有1个及以上参数");
            return;
        }
        if (this.runMessageWriteRunLog) {
            await this.writeRunLog(...arguments);
        }
        else {
            console.log(...arguments);
        }
        //let content = '打印日志：';
        let content = '';
        for (let i = 0; i < arguments.length; i++) {
            const arg = arguments[i];
            if (typeof arg === 'object' && arg !== null) {
                content += JSON.stringify(arg) + "\n";
            } else {
                content += String(arg) + "\n";
            }
        }

        //在运行窗口显示日志
        if (window.rpaVue && window.rpaVue.showRunLog) {
            window.rpaVue.showRunLog(content);
        }
    },

    /**
     * 在运行指令显示执行指令的位置显示消息
     * @param {any} msg 为空则不显示
     */
    async instructMessage(msg) {
        if (window.rpaVue) {
            await window.rpaVue.scriptInstructMsg(msg);
        }
    },

    /**
     * 反馈跟踪信息 同时支持运行界面点击暂停、停止 注意停止会抛出异常 
     * @param {any} msg 同时在运行指令显示执行指令的位置显示消息 为空则不显示不更新原消息
     */
    async feedbackTrack(msg = '') {
        if (window.rpaVue) {
            await window.rpaVue.scriptFeedbackTrack(msg);
        }
    },

    ///**
    // * 加载js脚本 使用 script 元素动态创建
    // * @param {any} url
    // * @param {any} loadFinish 加载完成回调方法
    // */
    //loadScript(url, loadFinish = null) {
    //    const script = document.createElement('script');
    //    script.src = url;
    //    if (loadFinish != null) {
    //        script.onload = loadFinish;
    //    }
    //    script.onerror = function () {
    //        console.error(`Failed to load script: ${url}`);
    //    };
    //    document.head.appendChild(script);
    //},
    //// 加载js脚本 使用 fetch eval
    //async loadScriptWithFetch(url) {
    //    try {
    //        const response = await fetch(url);
    //        if (!response.ok) {
    //            throw new Error(`HTTP error! status: ${response.status}`);
    //        }
    //        const scriptContent = await response.text();
    //        // 使用 eval 执行脚本内容
    //        eval(scriptContent);
    //        console.log('Script loaded and executed successfully');
    //    } catch (error) {
    //        console.error(`Failed to load script: ${error.message}`);
    //    }
    //},
    /**
     * 解析url转换为对象 传入完整url 返回对象 { domain, path, search, params } params是对象
     * @param {any} url 要解析的url
     * @returns
     */
    parseUrl(url) {
        try {
            url = decodeURIComponent(url);
            const urlObj = new URL(url);
            const domain = urlObj.origin;
            const path = urlObj.pathname;
            const search = urlObj.search;
            const queryString = urlObj.search.slice(1);

            const params = {};
            if (queryString) {
                const pairs = queryString.split('&');
                for (let i = 0; i < pairs.length; i++) {
                    const pair = pairs[i].split('=');
                    const key = decodeURIComponent(pair[0]);
                    const value = decodeURIComponent(pair[1] || '');
                    params[key] = value;
                }
            }

            return {
                domain,
                path,
                search,
                params
            };
        } catch (e) {
            console.error(`url解析出错：`, url);
        }
    },
    /**
     * url对象转换为url字符串 传入{domain, path, params} 拼接 params是对象
     * @param {any} urlInfo 对象如 {domain, path, params}
     * @returns
     */
    urlStringify(urlInfo) {
        try {
            const { domain, path, params } = urlInfo;

            const queryString = Object.entries(params).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
            const fullUrl = decodeURIComponent(`${domain}${path}${(queryString ? `?${queryString}` : '')}`);
            return fullUrl;
        } catch (e) {
            console.error(`url序列化出错：`, urlInfo);
        }
    },
    /**   
     * url参数转换为字符串 传入 { id: 1 } 返回 ?id=1
     * @param {any} params 对象如 { id: 1 }
     */
    urlParamStringify(params) {
        try {
            const queryString = decodeURIComponent(Object.entries(params).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&'));
            return queryString ? ('?' + queryString) : '';
        } catch (e) {
            console.error(`url参数序列化出错：`, params);
        }
    },
    /**
     * 复制对象
     * @param {any} obj 源对象
     */
    copyObject(obj) {
        const deepCopy = JSON.parse(JSON.stringify(obj));
        return deepCopy;
    },

    /**
     * sql查询列表数据 参数1 select * from user where age > @age" 参数2  { age = 25 } 还可以传 Dictionary<string, object>
     * @param {any} sql 
     * @param {any} jsonParam
     * @returns
     */
    async sqlQueryDataTable(sql, jsonParam = null) {
        var resp = JSON.parse(await this.rpaApi.sqlQueryDataTable(sql, JSON.stringify(jsonParam)));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     *  sql聚合查询 返回第一行第一列数据
     * @param {any} sql 
     * @param {any} jsonParam
     * @returns
     */
    async sqlExecuteScalar(sql, jsonParam = null) {
        var resp = JSON.parse(await this.rpaApi.sqlExecuteScalar(sql, JSON.stringify(jsonParam)));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     *  sql执行不查询 返回影响行数
     * @param {any} sql 
     * @param {any} jsonParam
     * @returns
     */
    async sqlExecuteNonQuery(sql, jsonParam = null) {
        var resp = JSON.parse(await this.rpaApi.sqlExecuteNonQuery(sql, JSON.stringify(jsonParam)));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },

    /**
     * 上传多个文件弹窗 设置上传文件路径 支持本地文件和data:开头的图片字符串
     * @param {any} jsonPaths 文件路径字符串数组 `["文件路径", "data:开头的图片字符串"]`
     * @returns
     */
    async setUploadFilePath(jsonPaths) {
        var resp = JSON.parse(await this.rpaApi.setUploadFilePath(jsonPaths));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.ok;
    },

    /**
     * 保存当前页面cookie到文件
     * @param {*} fileName 弹窗默认文件名
     */
    async saveCookie(fileName = 'cookie1.txt') {
        console.log('请选择保存位置 默认文件名：' + fileName);
        await this.rpaApi.saveCookie(fileName);
        console.log("操作完成");
    },
    /**
     * 载入本地cookie文件
     * @param {*} fileName 文件名 不用填可以弹窗选择文件
     * @param {*} autoGo 是否自动跳转页面 默认true
     */
    async loadCookie(fileName = 'cookie1.txt', autoGo = true) {
        console.log('请选择导入文件：' + fileName + (autoGo ? " 自动跳转页面" : " 不自动跳转页面"));
        console.log(await this.rpaApi.loadCookie(fileName, autoGo));
    },

    /**
     * 鼠标在页面指定位置按下 使用winApi会自动转换为桌面坐标
     * @param {any} x 水平坐标 相对于页面左上角不是桌面
     * @param {any} y
     * @param {any} useWinApi 使用真实鼠标 默认false
     */
    async mouseDown(x, y, useWinApi = false) {
        await this.rpaApi.mouseDown(x, y, useWinApi);
    },
    /**
     * 鼠标在页面指定位置按下 使用winApi会自动转换为桌面坐标
     * @param {any} x 水平坐标 相对于页面左上角不是桌面
     * @param {any} y
     * @param {any} useWinApi 使用真实鼠标 默认false
     */
    async mouseUp(x, y, useWinApi = false) {
        await this.rpaApi.mouseUp(x, y, useWinApi);
    },
    /**
     * 鼠标在页面指定位置按下 使用winApi会自动转换为桌面坐标
     * @param {any} x 水平坐标 相对于页面左上角不是桌面
     * @param {any} y
     * @param {any} useWinApi 使用真实鼠标 默认false
     */
    async mouseMove(x, y, useWinApi = false) {
        await this.rpaApi.mouseHover(x, y, useWinApi, false);
    },
    /**
     * 网页截图 指定矩形 最小化取截图矩形可能有问题 先激活窗口等待1秒再截图
     * @param {any} rect 矩形 获取方法：元素.getBoundingClientRect() 或者自定义：{x, y, width, height}
     * @param {any} saveFile 是否保存到本地文件
     * @returns 返回{savePath, base64}
     */
    async captureScreen(rect, saveFile = false) {
        //await this.focusChromeForm();
        await this.sleep(500);
        return await this.rpaApi.captureScreen(rect.x, rect.y, rect.width, rect.height, saveFile);
    },
    /**
     * 激活窗口 最小化会还原 默认会激活窗口前端显示
     */
    async focusChromeForm(focus = true) {
        await this.rpaApi.focusChromeForm(focus);
    },

    /**
     * 鼠标按轨迹拖拽元素
     * @param {any} startX 开始水平坐标 一般设置元素中心点
     * @param {any} startY 开始垂直坐标
     * @param {any} trajectoryArr 移动轨迹 参数如：[{x:0, y: 0, ms:1}] ms每次操作间隔秒数
     * @param {any} useWinApi 是否使用winApi 一般测试可用来看滑动轨迹
     */
    async mouseTrajectoryMove(startX, startY, trajectoryArr, useWinApi = false) {
        var currentX = startX;
        var currentY = startY;
        // 模拟鼠标按下事件 在滑块中心点按下
        this.mouseDown(currentX, currentY, useWinApi);
        //moveSlide.dispatchEvent(new MouseEvent('mousedown', {
        //    bubbles: true,
        //    cancelable: true,
        //    clientX: currentX,
        //    clientY: currentY,
        //    button: 0 // 左键
        //}));
        await this.sleep(500);
        // 逐步移动鼠标
        for (const item of trajectoryArr) {
            currentX = item.x;
            currentY = item.y;      //随机y模拟人工拉
            // console.log('鼠标位置：', currentX, currentY);
            //创建鼠标移动事件 移动事件可以作用于document，模拟鼠标在页面上移动 
            this.mouseMove(currentX, currentY, useWinApi);
            //document.dispatchEvent(new MouseEvent('mousemove', {
            //    bubbles: true,
            //    cancelable: true,
            //    clientX: currentX,
            //    clientY: currentY
            //}));
            await this.sleep(item.ms);
        }
        await this.sleep(500);
        // 最后模拟鼠标弹起
        //console.log('即将弹起 鼠标位置：', currentX, currentY);
        this.mouseUp(currentX, currentY, useWinApi);
        //moveSlide.dispatchEvent(new MouseEvent('mouseup', {
        //    bubbles: true,
        //    cancelable: true,
        //    clientX: currentX,
        //    clientY: currentY,
        //    button: 0 // 左键
        //}));

    },
    /**
     * 生成滑块移动轨迹 适用从左向右移动拉滑块补缺口验证
     * @param {number} startX 开始X坐标 一般都是鼠标按下的位置
     * @param {number} startY 开始Y坐标
     * @param {number} totalPixels 总移动像素数
     * @param {number} moveCount 移动次数（移动次数越高越精细但会变慢 建议为总像素数的1/3到1/4）
     * @param {number} speed 基础速度（影响延迟时间数值越大越快 建议70左右）
     * @returns {Array} 轨迹数组，每个元素包含x、y坐标和延迟毫秒数ms
     */
    generateSliderTrajectoryHorizontal(startX, startY, totalPixels, moveCount, speed = 60) {
        const trajectory = [];
        let currentX = startX;
        let currentY = startY;
        let totalMoved = 0;
        let direction = 1; // 1表示向右，-1表示向左

        // 每次移动的基础像素（平均分配）
        const baseStep = totalPixels / moveCount;

        for (let i = 0; i < moveCount; i++) {
            // 计算本次X方向移动的像素（在基础步长上下浮动）
            let stepX;
            if (direction === 1) {
                // 向右移动时，确保不会一次移动过多导致超出
                const remaining = totalPixels - totalMoved;
                stepX = Math.min(
                    baseStep * (0.8 + Math.random() * 0.4), // 80%-120%的基础步长
                    remaining + baseStep * 0.5 // 允许略微超过
                );
            } else {
                // 向左移动
                stepX = baseStep * (0.8 + Math.random() * 0.4);
            }

            // 计算新X坐标
            const newX = currentX + stepX * direction;
            // Y坐标在原位置上下随机-5到5
            const newY = currentY + (Math.random() * 10 - 5);

            // 更新总移动距离
            totalMoved += stepX;

            // 检查是否需要改变方向（向右移动超过总像素时）
            if (direction === 1 && (newX - startX) > totalPixels) {
                direction = -1; // 改为向左移动
            }

            // 计算延迟时间（基于速度，加入随机变化）
            const baseDelay = 1000 / speed; // 基础延迟
            const delay = Math.floor(baseDelay * (0.7 + Math.random() * 0.6)); // 70%-130%的基础延迟

            // 添加到轨迹
            trajectory.push({
                x: Math.round(newX),
                y: Math.round(newY),
                ms: delay
            });

            // 更新当前位置
            currentX = newX;
            currentY = newY;
        }

        // 最后一步确保回到总像素位置（处理可能的偏差）
        if (Math.abs(currentX - (startX + totalPixels)) > 1) {
            trajectory.push({
                x: Math.round(startX + totalPixels),
                y: Math.round(startY + (Math.random() * 10 - 5)),
                ms: Math.floor((1000 / speed) * 0.8)
            });
        }

        return trajectory;
    },
    /**
     * 生成滑块移动轨迹 支持任意目标坐标，模拟更自然的人工操作
     * @param {number} startX 开始X坐标 一般是鼠标按下的位置
     * @param {number} startY 开始Y坐标
     * @param {number} targetX 目标X坐标
     * @param {number} targetY 目标Y坐标
     * @param {number} moveCount 移动次数（移动次数越高越精细但会变慢 建议为总距离的1/3到1/4）
     * @param {number} speed 基础速度（影响延迟时间数值越大越快 建议70左右）
     * @returns {Array} 轨迹数组，每个元素包含x、y坐标和延迟毫秒数ms
     */
    generateSliderTrajectory(startX, startY, targetX, targetY, moveCount, speed = 60) {
        const trajectory = [];
        let currentX = startX;
        let currentY = startY;

        // 计算总距离和每一步的基础方向向量
        const totalDeltaX = targetX - startX;
        const totalDeltaY = targetY - startY;
        const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);

        // 每一步的基础距离（平均分配）
        const baseStepDistance = totalDistance / moveCount;

        for (let i = 0; i < moveCount; i++) {
            // 计算当前应该移动到的理想位置（直线）
            const progress = i / moveCount;
            const idealX = startX + totalDeltaX * progress;
            const idealY = startY + totalDeltaY * progress;

            // 计算步长距离（在基础步长上下浮动，模拟不均匀速度）
            const stepDistance = baseStepDistance * (0.7 + Math.random() * 0.6);

            // 计算方向（基于理想位置，但加入随机偏移使轨迹更自然）
            let dirX = idealX - currentX;
            let dirY = idealY - currentY;

            // 标准化方向向量
            const currentDist = Math.sqrt(dirX * dirX + dirY * dirY) || 0.1;
            dirX /= currentDist;
            dirY /= currentDist;

            // 添加随机偏移，使轨迹更像人手移动
            const randomAngle = (Math.random() - 0.5) * Math.PI / 3; // -30° 到 30° 随机角度偏移
            const randomDistX = Math.cos(randomAngle) * stepDistance * (0.2 + Math.random() * 0.3);
            const randomDistY = Math.sin(randomAngle) * stepDistance * (0.2 + Math.random() * 0.3);

            // 计算新位置
            let newX = currentX + dirX * stepDistance + randomDistX;
            let newY = currentY + dirY * stepDistance + randomDistY;

            // 接近目标时减少随机偏移，提高准确性
            const remainingDistance = Math.sqrt(
                (targetX - newX) ** 2 +
                (targetY - newY) ** 2
            );
            if (remainingDistance < baseStepDistance * 2) {
                // 最后两步直接向目标靠近
                newX = targetX * 0.7 + newX * 0.3;
                newY = targetY * 0.7 + newY * 0.3;
            }

            // 计算延迟时间（模拟人手速度变化）
            const baseDelay = 1000 / speed;
            // 开始和结束时速度较慢，中间较快
            const speedFactor = 0.8 + Math.sin((i / moveCount) * Math.PI) * 0.4;
            const delay = Math.floor(baseDelay * speedFactor * (0.8 + Math.random() * 0.4));

            // 添加到轨迹
            trajectory.push({
                x: Math.round(newX),
                y: Math.round(newY),
                ms: delay
            });

            // 更新当前位置
            currentX = newX;
            currentY = newY;
        }

        // 最后一步确保精确到达目标位置
        if (Math.abs(currentX - targetX) > 1 || Math.abs(currentY - targetY) > 1) {
            trajectory.push({
                x: Math.round(targetX),
                y: Math.round(targetY),
                ms: Math.floor((1000 / speed) * 0.9)
            });
        }

        return trajectory;
    },

    /**
     * 常规拉动滑块补缺口验证 此方法只能在滑块所在页面执行
     * @param {any} slideName 可移动的滑块元素 支持传入已获取的页面元素和元素库已保存的名称使用匹配第一个
     * @param {any} moveXNum 需要水平方向移动的像素数
     * @param {any} moveYNum 需要垂直方向移动的像素数
     * @param {any} useWinApi 是否使用winApi 设置true可用来看滑动轨迹
     */
    async autoGapFillSlider(slideName, moveXNum, moveYNum, useWinApi = false) {
        var moveSlide = null;
        if (typeof slideName == "string") {
            var elements = await this.getElement(slideName);
            if (elements && elements.length > 0) {
                moveSlide = elements[0];
            }
        } else {
            moveSlide = slideName;
        }

        // 检查元素是否存在
        if (moveSlide) {
            await this.focusChromeForm(false);
            // 获取元素在页面中的位置信息
            const rect = moveSlide.getBoundingClientRect();
            // 以元素中心作为起始点 鼠标操作过程中的xy坐标 要注意鼠标按下弹起时都用这个坐标
            var currentX = parseInt(rect.left + rect.width / 2);
            var currentY = parseInt(rect.top + rect.height / 2);

            // 模拟鼠标移动过程（分步骤移动使动画更自然）
            var steps = parseInt(moveXNum / 3.0); // 移动步数根据需移动像素数计算 除以3则表示每次移动3像素左右
            if (moveYNum > moveXNum) {
                steps = parseInt(moveYNum / 3.0);
            }
            //生成轨迹点 
            var trajectoryArr = this.generateSliderTrajectory(currentX, currentY, currentX + moveXNum, currentY + moveYNum, steps, 60);
            //console.log(`准备拖动次数：${steps} 鼠标位置：${currentX},${currentY} 轨迹点：`, trajectoryArr); 
            //开始移动
            await this.mouseTrajectoryMove(currentX, currentY, trajectoryArr, useWinApi);
        }
    },

    // 下载图片并转为Base64返回
    async fetchImageAsBase64(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`下载图片失败: ${url}`);
        const blob = await response.blob();
        // 使用FileReader将Blob转换为Base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            // 转换完成时触发
            reader.onloadend = () => {
                // result属性包含Base64字符串
                resolve(reader.result);
            };
            // 转换失败时触发
            reader.onerror = reject;
            // 开始转换
            reader.readAsDataURL(blob);
        });
    },
    /**
     * 识别缺口滑块验证图片 传了前两个字段才能自动拉滑块否则都是返回识别结果 从左往右拉的滑块根据返回的slideImageLeftPercent*背景图宽度计算滑块需要移动的像素数 
     * @param {any} bgName 背景图保存到元素库名称 不配置则使用bgImgUrl识别返回缺口位置 支持传入已获取的html元素和保存的元素名
     * @param {any} slideName 滑块图保存到元素库名称
     * @param {any} bgImgUrl 背景图url 优先级比bgName高（不包含滑块的背景图可从元素上src下载 不要截图） 支持传入base64图片字符串
     * @param {any} slideImgUrl 滑块图url
     * @param {any} offsetX 水平偏移量 往右+ 往下+
     * @param {any} offsetY 垂直偏移量
     * @param {any} useWinApi 是否使用winApi 可以看到鼠标移动轨迹建议测试用
     * @returns 响应识别结果json对象 { code: 200, data: { slideImageLeftPercent: 0.9 } }
     */
    async ocrGapSliderImage(bgName = null, slideName = null, bgImgUrl = null, slideImgUrl = null, offsetX = 0, offsetY = 0, useWinApi = false) {
        var result = { code: 200, message: '' };
        try {
            //// 并发下载两张图片
            //const [bgBase64, slideBase64] = await Promise.all([
            //    this.fetchImageAsBase64(bgImgUrl),
            //    this.fetchImageAsBase64(slideImgUrl)
            //]);
            //处理下载图片 优先从指定图片字段下载
            var bgBase64 = bgImgUrl;
            if (bgImgUrl && (bgImgUrl.startsWith("http://") || bgImgUrl.startsWith("https://"))) {
                bgBase64 = await this.fetchImageAsBase64(bgImgUrl);
            }
            var slideBase64 = slideImgUrl;
            if (slideImgUrl && (slideImgUrl.startsWith("http://") || slideImgUrl.startsWith("https://"))) {
                slideBase64 = await this.fetchImageAsBase64(slideImgUrl);
            }

            //获取元素
            var imgBackground = null;
            if (bgName && typeof bgName == "string") {
                var elements = await this.getElement(bgName);
                if (elements && elements.length > 0) {
                    imgBackground = elements[0];
                }
            } else {
                imgBackground = bgName;
            }
            if (!bgBase64) {
                bgBase64 = await this.fetchImageAsBase64(imgBackground.src);                 //如果未取到背景图则尝试从元素上的src上获取
            }
            var imgMoveSlide = null;
            if (slideName && typeof slideName == "string") {
                var elements = await this.getElement(slideName);
                if (elements && elements.length > 0) {
                    imgMoveSlide = elements[0];
                }
            } else {
                imgMoveSlide = slideName;
            }
            if (!slideBase64) {
                slideBase64 = await this.fetchImageAsBase64(imgMoveSlide.src);
            }

            //开始识别
            if (bgBase64 && slideBase64) {
                var resp = JSON.parse(await this.rpaApi.ocrGapSliderImage(bgBase64, slideBase64));
                //console.log('识别结果：', resp);
                if (!imgBackground || !imgMoveSlide) {
                    return JSON.stringify(resp);                    //返回识别结果 只有取到所需元素才能自动拉滑块
                }
                if (resp && resp.code == 200 && resp.data) {
                    var bgRect = imgBackground.getBoundingClientRect();
                    var slideRect = imgMoveSlide.getBoundingClientRect();
                    var qkLeft = bgRect.width * resp.data.slideImageLeftPercent;                        //缺口左侧到背景左侧距离
                    var hkBgLeft = slideRect.left - bgRect.left;                                                     //滑块图左侧到背景图左侧距离
                    var moveXNum = parseInt(qkLeft - hkBgLeft + offsetX);                               //计算滑块需要水平移动的像素数
                    var moveYNum = parseInt(bgRect.height * resp.data.slideImageTopPercent - (slideRect.top - bgRect.top) + offsetY);
                    await this.autoGapFillSlider(imgMoveSlide, moveXNum, moveYNum, useWinApi);
                    result.data = resp.data;
                    result.message = '操作成功'
                } else {
                    return JSON.stringify(resp);
                }
            } else {
                result.message = '未获取到滑块图和背景图参数'
                result.code = 400;
            }
        } catch (e) {
            result.message = `处理过程出错：${e}`
            result.code = 400;
        }
        return JSON.stringify(result);
    },

    /**
     * 识别图形验证码 返回文本验证码 建议获取结果后先校验验证码位数是否符合再继续操作
     * @param {any} imgName 图片保存到元素库名称
     * @param {any} imgUrl 图片url或base64字符串 优先级比imgName高 二选一
     * @returns 响应识别结果json对象 { code: 200, data: 'xxxx' }
     */
    async ocrImgVerifyCode(imgName = null, imgUrl = null) {
        var result = { code: 200, message: '' };
        try {
            //处理下载图片 优先从指定图片字段下载 最终需要base64
            var bgBase64 = imgUrl;
            if (imgUrl && (imgUrl.startsWith("http://") || imgUrl.startsWith("https://"))) {
                bgBase64 = await this.fetchImageAsBase64(imgUrl);
            }

            //获取元素src下载图片 最终需要base64
            var imgBackground = null;
            if (imgName && typeof imgName == "string") {
                var elements = await this.getElement(imgName);
                if (elements && elements.length > 0) {
                    imgBackground = elements[0];
                }
            } else {
                imgBackground = imgName;
            }
            if (!bgBase64 && imgBackground) {
                await this.focusChromeForm(false);
                await this.sleep(1000);
                var captureScreen = JSON.parse(await this.captureScreen(imgBackground.getBoundingClientRect()));
                if (captureScreen && captureScreen.base64) {
                    bgBase64 = captureScreen.base64;
                }
            }

            //开始识别
            if (bgBase64) {
                var resp = JSON.parse(await this.rpaApi.ocrImgVerifyCode(bgBase64));
                //console.log('识别结果：', resp); 
                return JSON.stringify(resp);
            } else {
                result.message = '未获取到滑块图和背景图参数'
                result.code = 400;
            }
        } catch (e) {
            result.message = `处理过程出错：${e}`;
            result.code = 400;
        }
        return JSON.stringify(result);
    },
    //同步睡眠
    sleepSync(ms = 100) {
        const start = Date.now(); // 记录起始时间戳（毫秒）
        // 循环阻塞，直到时间差超过延迟毫秒数
        while (Date.now() - start < ms) {
            // 空循环，消耗时间
        }
        return 'sleepSync完成'
    },
    //获取指定范围随机数 包含min和max
    getRandomNum(min = 1, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    //重写window.open方法
    //__native_window_open__: null,
    overrideWindowOpen() {
        var that = this;
        //if (!that.__native_window_open__) {
        //    that.__native_window_open__ = window.open;
        //}

        if (!window.____rpaName_____native_window_open) {
            window.____rpaName_____native_window_open = window.open;
            //console.log('覆盖____rpaName_____native_window_open')
        }

        //文档：https://www.runoob.com/jsref/met-win-open.html
        window.open = function (url, name = '_blank', specs = '', replace = false) {
            try {
                if (!url) {
                    return null;                            //优化部分页面弹出前会弹空白页导致后面要加载url无法加载问题 若要打开空白页传"about:blank"
                }
                that.rpaApi.windowOpenBefore(url || '', name, specs, replace);
            } catch (e) {
                //console.error(`overrideWindowOpen执行出错：`, e);
            }
            //console.log('即将打开子弹窗', url)
            var openResult = window.____rpaName_____native_window_open.call(window, url, name, specs, replace);                   //使用原生window.open打开窗口
            //console.log('打开子弹窗成功', openResult)
            //that.sleepSync(1000)
            return openResult
        };
        //console.log('重写window.open成功')
    },

}

//重写window.open
____rpaName____.overrideWindowOpen();
if (window.____rpaApiName____) {
    ____rpaName____.rpaApi = window.____rpaApiName____                                  //在其他环境尝试赋值一下
}
if (____rpaName____.debug) {
    console.log('rpa加载完成');
}