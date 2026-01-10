//封装一些rpa常用操功能 发布正式需要注意：先提交git推送线上防止丢代码 然后用混淆所有js不影响功能 在线工具：https://www.bejson.com/encrypt/jsobfuscate/#google_vignette
var ____rpaName____ = {
    //是不是debug模式
    debug: ____debug____,
    //注册的内置方法 页面加载完成运行时赋值
    rpaApi: null,
    //是否已停止执行 为true后所有循环等待都停止
    stop: false,

    //#region RPA方法

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

        if (useWinApi) await this.focusChromeForm(false);
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
     * 等待元素消失在文档中
     * @param {any} elName 元素库保存的元素名
     * @param {any} waitSecond 等待秒数 默认20秒
     * @param {any} throwEx 超时不消失是否抛出异常 默认false
     * @returns
     */
    async waitNotInDoc(elName, waitSecond = 20, throwEx = false) {
        //等待消失
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            var elItems = await this.getElement(elName);
            if (elItems.length == 0) {
                return true;
            }
        }
        if (throwEx) {
            throw `等待元素 ${elName} 消失在文档中超时`;
        } else {
            return false;
        }
    },
    /**
     * 等待元素出现在文档中
     * @param {any} elName 元素库保存的元素名
     * @param {any} waitSecond 等待秒数 默认20秒
     * @param {any} throwEx 超时不存在是否抛出异常 默认true  检测元素是否存在传false
     * @returns 返回第一个匹配的元素 返回null表示未出现
     */
    async waitInDoc(elName, waitSecond = 20, throwEx = true) {
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            var elItems = await this.getElement(elName);
            if (elItems.length > 0) {
                //return true;
                return elItems[0];
            }
        }
        if (throwEx) {
            throw `等待元素 ${elName} 出现在文档中超时`;
        } else {
            return null
        }
    },
    /**
     * 等待元素出现在可视区域中
     * @param {any} elName 元素库保存的元素名
     * @param {any} waitSecond 等待秒数 默认20秒
     * @param {any} throwEx 超时不存在是否抛出异常 默认true  检测元素是否存在传false
     * @returns 返回第一个匹配的可见元素 返回null表示未出现
     */
    async waitVisible(elName, waitSecond = 20, throwEx = true) {
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
                //return true;
                return el;
            }
        }
        if (throwEx) {
            throw `等待元素 ${elName} 出现在可视区域中超时`;
        } else {
            return null
        }
    },
    /**
     * 鼠标悬停在元素上
     * @param {any} elName 元素库保存的元素名 
     * @returns 返回第一个匹配到的元素 没有则返回null
     */
    async hover(elName, useWinApi = false) {
        var el = await this.waitVisible(elName);
        if (el) {
            if (useWinApi) await this.focusChromeForm(useWinApi);
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
        if (useWinApi) await this.focusChromeForm(useWinApi);
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
    * 打开web页面 返回页面id
    * @param {any} url 为空打开空白页
    * @param {any} focusChromeForm 是否激活浏览器窗体 默认false
    * @param {any} waitLoad 是否等待页面加载完成 默认true
    * @returns
    */
    async openPage(url, focusChromeForm = false, waitLoad = true) {
        if (focusChromeForm) await this.focusChromeForm(false);
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
        if (focusChromeForm) await this.focusChromeForm(false);
        await this.rpaApi.selectTabPage(id);
        await this.sleep(500);
    },

    /**
     * 等待指定tab窗口关闭
     * @param {any} tabId 窗口id 就是网页id
     */
    async waitPageClose(tabId, waitSecond = 10) {
        await this.waitSleepAsync("webPage_" + tabId, waitSecond * 1000);
    },
    /**
     * 指定tab窗口关闭后唤醒当前流程 此方法不需要开发者调用 由程序关闭窗口触发
     * @param {any} tabId 窗口id
     */
    wakePage(tabId) {
        this.wakeSleepAsync("webPage_" + tabId);
    },

    /**
     * 在指定web页面执行任意方法 支持传入json字符串参数 获取返回参数 会等待页面加载完成再执行
     * @param {any} id 页面id
     * @param {any} funcName js方法名 window.xxxxx 不管是不是异步方法都不需要带await
     * @param {any} waitSecond 执行等待超时秒数 参数必传否则会无法执行
     * @param {any} jsonParam json字符串参数无参数可传"null" 参数必传否则会无法执行 赋值语句传null
     * @param {any} throwEx 是否执行超时或者其他异常在此方法抛出 默认true
     * @returns 返回原方法数据 建议返回json字符串 直接返回对象可能会有意想不到问题
     */
    async callPageJS(id, funcName, waitSecond = 200, jsonParam = "null", throwEx = true) {
        if (id < 0) {
            throw '页面id必填 必须大于等于0';
        }
        if (!funcName) {
            throw 'rpa方法名必填';
        }
        var resp = JSON.parse(await this.rpaApi.callPageJS.apply(this, arguments));
        if (!resp.ok) {
            if (throwEx) {
                throw resp.message;
            }
            return null
        }
        return resp.body;
    },
    /**
     * 在指定页面执行rpa方法 前面两个参数必填 注意后面可继续增加参数是传入调用rpa方法的 会等待页面加载完成再执行
     * @param {any} id 页面id
     * @param {any} rpaFuncName rpa方法名 必须是rpa对象内方法
     * @returns 返回指定页面方法返回数据 失败返回null
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
            if (!resp.ok) {
                throw resp.message;
            }
            return resp.body;
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
     * @param {any} defDir 默认位置设置null则不限制 占位符%AppScript%脚本根目录 %AppName%应用名称目录
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
     * 打开选择文件夹、目录弹窗
     * @param {any} defDir 默认位置 桌面 我的文档 系统下载
     * @param {any} desc 弹窗可见的一段描述文字
     * @returns
     */
    async openFolderDialog(defDir = null, desc = null) {
        var resp = JSON.parse(await this.rpaApi.openFolderBrowserDialog(defDir, desc));
        if (!resp.ok) {
            throw resp.message;          //throw new Error(resp.message);
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
        if (content) {
            await this.rpaApi.writeRunLog(content);
        } else {
            console.log('发现空日志');
        }
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
     * @param {Object} obj 源对象
     */
    copyObject(obj) {
        const deepCopy = JSON.parse(JSON.stringify(obj));
        return deepCopy;
    },

    /**
     * sql查询列表数据 参数1 select * from user where age > @age" 参数2  { age = 25 } 
     * @param {string} sql 
     * @param {Object} jsonParam 使用对象字段对应sql中参数 需注意时间类型处理与拼接sql方式的格式可能不同 条件过滤可能存在时差
     * @returns 返回数组每个元素都是对象对应每行数据 如 [行数据]
     */
    async sqlQueryDataTable(sql, jsonParam = null) {
        var resp = JSON.parse(await this.rpaApi.sqlQueryDataTable(sql, JSON.stringify(jsonParam)));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    /**
     * sql聚合查询 返回第一行第一列数据
     * @param {string} sql
     * @param {Object} jsonParam 使用对象字段对应sql中参数 需注意时间类型处理与拼接sql方式的格式可能不同 条件过滤可能存在时差
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
     * sql执行不查询 返回影响行数
     * @param {string} sql 
     * @param {Object} jsonParam  使用对象字段对应sql中参数 需注意时间类型处理与拼接sql方式的格式可能不同 条件过滤可能存在时差
     * @returns
     */
    async sqlExecuteNonQuery(sql, jsonParam = null) {
        var resp = JSON.parse(await this.rpaApi.sqlExecuteNonQuery(sql, JSON.stringify(jsonParam)));
        if (!resp.ok) {
            throw resp.message;
        }
        return resp.body;
    },
    //where对象转sql条件 如{field: value}转为field=value
    whereObjTransStr(whereObj) {
        const whereFieldNames = Object.keys(whereObj);
        if (whereFieldNames.length === 0) { return ''; }
        const supportedOperators = new Set(['=', '>', '<', '>=', '<=', '<>', '!=', 'LIKE', 'NOT LIKE']);                // 定义支持的常见SQL操作符（可根据需求扩展）
        const singleWhereClauses = whereFieldNames.map(field => {
            const value = whereObj[field];
            let formattedValue;
            let operator = '='; // 默认操作符为等值匹配
            // 第一步：判断是否为操作符对象 { op: 'xxx', value: xxx }
            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && 'op' in value && 'value' in value) {
                // 验证操作符是否支持，不支持则回退为默认的'='
                operator = supportedOperators.has(value.op.toUpperCase()) ? value.op.toUpperCase() : '=';
                // 提取操作符对象中的实际值，后续进行格式处理
                formattedValue = this.formatSqlValue(value.value);
            } else {
                // 普通值类型，沿用原有逻辑处理格式
                formattedValue = this.formatSqlValue(value);
            }
            // 拼接单个查询条件：字段 + 操作符 + 格式化后的值
            return `${field}${operator}${formattedValue}`;
        });
        return singleWhereClauses.join(' AND ');            // 多条件用AND连接，返回完整条件字符串
    },
    //格式化sql值 返回符合sql的值
    formatSqlValue(value) {
        let formattedValue = 'NULL';
        if (value === null || value === undefined) {
            return formattedValue;
        }
        // 处理不同数据类型，保证SQL语法正确
        if (typeof value === 'string') {
            // 字符串类型：包裹单引号，转义内部单引号避免SQL语法错误和注入风险
            formattedValue = `'${value.replace(/'/g, "''")}'`;
        } else if (value instanceof Date) {
            // 日期类型：转为ISO格式字符串，包裹单引号（兼容多数数据库）
            formattedValue = `'${value.toISOString().replace(/'/g, "''")}'`;
        } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // 其他纯对象（非数组、非日期）：转为JSON字符串，包裹单引号并转义内部单引号
            formattedValue = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        } else {
            // 数值、布尔、数组等类型：直接转为字符串（无需包裹引号）
            formattedValue = String(value);
        }
        return formattedValue;
    },
    /**
     * 指定表简单插入对象数组
     * @param {string} tableName 目标表名
     * @param {[Object]} dataArray 要插入的对象数组（每个对象对应一行数据，字段对应表字段）时间建议统一.toISOString()处理传入字符串
     * @returns {int} 插入成功行数量
     */
    async tableInsert(tableName, dataArray) {
        // 1. 严格参数校验
        if (!tableName || typeof tableName !== 'string') {
            throw new Error('无效的表名，请传入非空字符串');
        }
        if (!Array.isArray(dataArray) || dataArray.every(item => !item || typeof item !== 'object' || Array.isArray(item))) {
            throw new Error('无效的数据数组，请传入包含有效对象的非空数组');
        }

        // 2. 收集所有对象的字段，去重（避免多对象字段不一致）
        const allFields = new Set();
        dataArray.forEach(item => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                Object.keys(item).forEach(field => allFields.add(field));
            }
        });
        const fieldNames = Array.from(allFields);
        if (fieldNames.length === 0) {
            throw new Error('未提取到任何有效字段，无法生成SQL');
        }

        // 3. 生成多行VALUES子句（核心改造点：遍历数据数组，转换为每行的数值格式）
        const valuesClauses = dataArray.map(item => {
            // 过滤无效对象，避免报错
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return '';
            }
            // 按统一字段顺序提取每个字段的值，做好转义和格式处理 
            const fieldValues = fieldNames.map(field => { return this.formatSqlValue(item[field]) });
            // 拼接当前行的VALUES括号
            return `  (${fieldValues.join(', ')})`;
        }).filter(clause => clause !== ''); // 过滤无效行的空字符串

        // 若没有有效VALUES子句，抛出异常
        if (valuesClauses.length === 0) {
            throw new Error('数据数组中无有效数据行，无法生成VALUES子句');
        }

        // 4. 拼接完整SQL（与目标格式完全对齐，包含换行和缩进）
        const sql = `INSERT INTO ${tableName.trim()} (${fieldNames.join(', ')})
VALUES
${valuesClauses.join(',\n')};`;

        var insR = await this.sqlExecuteNonQuery(sql);
        return insR;
    },
    /**
     * 指定表简单更新单个对象 where的op支持'=', '>', '<', '>=', '<=', '<>', '!=', 'LIKE', 'NOT LIKE'
     * @param {string} tableName 目标表名
     * @param {Object} updateObj 更新对象 不可包含主键等不可修改的列 如果包含时间字段建议转为字符串传入
     * @param {Object} where 条件对象或字符串 如{ id: 1, time: { op: '>=', value: now.toISOString() } } 或用`id = 1 AND time >= '2026-01-04T07:44:50.764Z'`
     * @returns {int} 更新行数
     */
    async tableUpdate(tableName, updateObj, where) {
        // 1. 严格参数校验（延续之前的健壮性风格，规避无效入参） 
        if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
            throw new Error('无效的表名 请传入非空字符串');
        }
        if (!updateObj || typeof updateObj !== 'object' || Array.isArray(updateObj) || Object.keys(updateObj).length === 0) {
            throw new Error('无效的更新对象 请传入包含有效键值对的非空普通对象');
        }
        if (!where) throw new Error('请传入where条件');
        if (typeof where == 'object') where = this.whereObjTransStr(where);                                                        //对象转为字符串
        if (typeof where !== 'string') throw new Error('请传入where条件 并且类型是字符串类型 更新必须要传入条件');

        // 提取更新对象字段，生成SET子句（格式：field = @field，与示例占位符一致）
        const updateFieldNames = Object.keys(updateObj);
        const setClauses = updateFieldNames.map(field => {
            const value = updateObj[field];
            // 复用之前抽离的formatSqlValue方法格式化值（保证和where条件一致的处理逻辑）
            const formattedValue = this.formatSqlValue(value);
            return `${field}=${formattedValue}`;
        });
        const sql = `UPDATE ${tableName.trim()} SET ${setClauses.join(', ')} WHERE ${where};`;
        var updR = await this.sqlExecuteNonQuery(sql, updateObj);
        return updR;
    },
    /**
     * 指定表生成删除SQL并执行删除操作 where的op支持'=', '>', '<', '>=', '<=', '<>', '!=', 'LIKE', 'NOT LIKE'
     * @param {string} tableName 目标表名
     * @param {Object} where 条件对象或字符串 如{ id: 1, time: { op: '>=', value: now.toISOString() } } 或用`id = 1 AND time >= '2026-01-04T07:44:50.764Z'`
     * @returns {int} 受影响的行数（异步返回数据库删除操作影响的记录数）
     */
    async tableDelete(tableName, where) {
        if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
            throw new Error('无效的表名 请传入非空字符串');
        }
        if (!where) throw new Error('请传入where条件');
        if (typeof where == 'object') where = this.whereObjTransStr(where);                                                        //对象转为字符串
        if (typeof where !== 'string') throw new Error('请传入where条件 并且类型是字符串类型 删除必须要传入条件');

        const whereClause = `WHERE ${where}`;
        //拼接完整SQL语句（与示例格式完全对齐，DELETE FROM 表名 WHERE 条件） 
        const sql = `DELETE FROM ${tableName.trim()} ${whereClause};`;
        const deleteResult = await this.sqlExecuteNonQuery(sql); // 与更新操作一致，使用sqlExecuteNonQuery执行非查询操作
        return deleteResult;
    },
    /**
     * 指定表生成查询SQL并执行查询 需要注意时间条件格式要与插入时一致包含毫秒否则可能出现>包含=的  where的op支持'=', '>', '<', '>=', '<=', '<>', '!=', 'LIKE', 'NOT LIKE'
     * @param {string} tableName 目标表名
     * @param {Object} where 条件对象或字符串 如{ id: 1, time: { op: '>=', value: now.toISOString() } } 或用`id = 1 AND time >= '2026-01-04T07:44:50.764Z'`
     * @param {string} selectStr 查询字段默认*所有字段 聚合查询传入统计函数字段
     * @param {string} sortStr 排序字符串 如 '字段1 ASC, 字段2 DESC' 后面可接分页参数' LIMIT 0, 10'
     * @param {bool} isScalar 是不是聚合查询默认false 如果传true返回第一行第一列数据
     * @returns {[Object]} 查询结果集（异步返回数据库查询结果）
     */
    async tableQuery(tableName, where, selectStr = '*', sortStr = null, isScalar = false) {
        if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
            throw new Error('无效的表名，请传入非空字符串');
        }
        if (!where) throw new Error('请传入where条件');
        if (typeof where == 'object') where = this.whereObjTransStr(where);                                                        //对象转为字符串
        if (typeof where !== 'string') throw new Error('请传入where条件 并且类型是字符串类型');

        let whereClause = '';
        if (where) whereClause = `WHERE ${where}`;

        let sql = `SELECT ${selectStr} FROM ${tableName.trim()} ${whereClause}`;
        if (sortStr) {
            sql += ` ORDER BY ${sortStr}`;
        }
        sql += ";";
        if (isScalar) {
            return await this.sqlExecuteScalar(sql);
        }
        else {
            return await this.sqlQueryDataTable(sql);
        }
    },

    /**
     * 上传多个文件弹窗 设置上传文件路径 支持本地文件和data:开头的图片字符串
     * @param {string} jsonPaths 文件路径数组 ["文件路径", "或data:开头的图片字符串"]
     * @returns
     */
    async setUploadFilePath(jsonPaths) {
        var resp = JSON.parse(await this.rpaApi.setUploadFilePath(JSON.stringify(jsonPaths)));
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
     * 激活窗口 最小化会还原 
     * @param {any} focus 默认true会激活窗口前端显示
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
        await this.sleep(500);
        // 逐步移动鼠标
        for (const item of trajectoryArr) {
            currentX = item.x;
            currentY = item.y;      //随机y模拟人工拉
            // console.log('鼠标位置：', currentX, currentY);
            //创建鼠标移动事件 移动事件可以作用于document，模拟鼠标在页面上移动 
            this.mouseMove(currentX, currentY, useWinApi);
            await this.sleep(item.ms);
        }
        await this.sleep(500);
        // 最后模拟鼠标弹起
        //console.log('即将弹起 鼠标位置：', currentX, currentY);
        this.mouseUp(currentX, currentY, useWinApi);
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

    //#endregion

    //#region 基础方法

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

    //等待唤醒数据暂存 resolve继续执行方法 sleepResolve缓存上一次继续执行方法 timeId等待执行时长计时器 tabId等待tab多标签浏览器关闭的id
    sleepData: { resolve: null, sleepResolve: null, timeId: 0, tabId: -1 },
    //支持异步多任务名等待唤醒数据暂存 { name: null, resolve: null, timeId: 0 }
    sleepDataAsync: [],
    /**
     * 线程睡眠 不支持异步并发调用 使用方法: 方法前面要带async变为异步方法 await sleep(200); // 每次等待 200 毫秒
     * @param {any} ms 等待时间 单位毫秒
     * @returns
     */
    sleep(ms = 0) {
        if (ms <= 0) {
            throw 'rpa.sleep等待时长必须大于0毫秒'
        }
        return new Promise((resolve) => setTimeout(resolve, ms));

        //var that = this.sleepData;
        //if (that.timeId != 0) {
        //    throw 'rpa.sleep已有睡眠请勿同时重复执行'
        //}
        //return new Promise((resolve) => {
        //    if (that.timeId != 0) {
        //        //alert("Rpa脚本 sleep方法 that.resolve将被覆盖，请检查是否存在异步并发执行等待指令流程可能存在不可意料的情况，或者更换支持异步并发等待指令");
        //        //throw "rpa.sleep方法 that.resolve将被覆盖，请检查是否存在异步流程同时执行等待指令，或者更换支持异步执行的等待指令";
        //        console.error("rpa.sleep方法 that.resolve将被覆盖，请检查是否存在异步流程同时执行等待指令，或者更换支持异步执行的等待指令");
        //        //为避免卡死 先唤醒
        //        that.sleepResolve();
        //        clearTimeout(that.timeId);
        //        that.timeId = 0;
        //    }
        //    that.sleepResolve = resolve;
        //    that.timeId = setTimeout(function () {
        //        //到设置的睡眠时间放行
        //        var sleepResolve = that.sleepResolve
        //        that.sleepResolve = null;
        //        that.timeId = 0;
        //        sleepResolve();
        //    }, ms)
        //});
    },
    /**
     * 线程睡眠等待另一个操作完成才唤醒继续执行后面流程
     * @param {any} ms 等待唤醒时间0不限制 单位毫秒 超过执行毫秒自动唤醒继续执行
     * @returns 返回false表示等待超时 true表示由wakeSleep方法正常唤醒表示另一个操作执行成功
     */
    waitSleep(ms = 20000) {
        var that = this.sleepData;
        return new Promise((resolve) => {
            that.resolve = resolve;
            if (ms > 0) {
                that.timeId = setTimeout(function () {
                    //通过这里执行的情况一般都是超时
                    resolve(false);
                    that.resolve = null;
                    that.timeId = 0;
                }, ms)
            }
        });
    },
    /**
     * 唤醒线程睡眠继续执行 配合waitSleep用
     */
    wakeSleep() {
        if (this.sleepData.timeId != 0) {
            clearTimeout(this.sleepData.timeId);
            this.sleepData.timeId = 0;
        }
        if (this.sleepData.resolve) {
            this.sleepData.resolve(true);
            this.sleepData.resolve = null;
        }
    },
    /**
     * 线程睡眠等待另一个操作完成才唤醒继续执行后面流程 支持多任务
     * @param {any} taskName 任务名字 唯一即可
     * @param {any} ms 等待唤醒时间0不限制 单位毫秒 超过执行毫秒自动唤醒继续执行
     * @returns 返回false表示等待超时 true表示由wakeSleep方法正常唤醒表示另一个操作执行成功
     */
    waitSleepAsync(taskName, ms = 20000) {
        if (this.sleepDataAsync.filter(w => w.name != taskName).length > 0) {
            throw `等待任务：${taskName} 有重名不可同时使用 请检查修改`;
        }
        var that = this.sleepDataAsync;
        return new Promise((resolve) => {
            var item = { name: taskName, resolve: resolve, timeId: 0 };
            if (ms > 0) {
                item.timeId = setTimeout(function () {
                    //通过这里执行的情况一般都是超时 移除任务
                    resolve(false);
                    //移除当前任务
                    for (var i = 0; i < that.length; i++) {
                        var item = that[i];
                        if (item.name == taskName) {
                            that.splice(i, 1);
                        }
                    }
                }, ms);
            }
            that.push(item);
        });
    },
    /**
     * 唤醒线程睡眠继续执行 配合waitSleepAsync用
     * @param {any} taskName 任务名字 唯一即可
     */
    wakeSleepAsync(taskName) {
        var tasks = this.sleepDataAsync.filter(w => w.name == taskName);
        if (tasks.length == 0) {
            //console.warn(`未找到正在等待的任务：${taskName} 请检查修改等待时长`);
            return;
        }

        var task = tasks[0];
        if (task.timeId != 0) {
            clearTimeout(task.timeId);
        }
        if (task.resolve) {
            task.resolve(true);
        }
        //移除当前任务
        for (var i = 0; i < this.sleepDataAsync.length; i++) {
            if (this.stop) { break; }
            var item = this.sleepDataAsync[i];
            if (item.name == taskName) {
                this.sleepDataAsync.splice(i, 1);
            }
        }
    },

    /**
     * 等待元素出现在dom中 使用方法: await rpa.waitElement(xx)
     * @param {any} selector 元素选择器 如 标签p .class #id 属性选择input[type="text"] 支持多元素.my-class.another-class 只返回第一个匹配的元素 用document.querySelectorAll可返回列表 https://blog.csdn.net/m0_57236802/article/details/130287312
     * @param {any} waitSecond 等待秒数 默认20秒
     * @returns 返回被选择的元素
     */
    async waitElement(selector, waitSecond = 20) {
        //console.log(waitSecond); 
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            var el = document.querySelector(selector);
            if (el !== null) {
                return el;
            }
        }
        return null;
    },

    ///**
    //* 等待元素出现在dom中 使用方法: await rpa.waitElement(xx)
    //* @param {any} selectorFunc 抓取元素的JS方法
    //* @param {any} waitSecond 等待秒数 默认20秒
    //* @returns 返回被选择的元素
    //*/
    //async waitElement4Func(selectorFunc, waitSecond = 20) {
    //    //console.log(waitSecond);
    //    for (var i = 0; i < waitSecond * 2; i++) {
    //        if (this.stop) { break; }
    //        await this.sleep(500);
    //        try {
    //            var el = selectorFunc();
    //            if (el !== null) {
    //                return el;
    //            }
    //        } catch (e) {

    //        }
    //    }
    //    return null;
    //},
    /**
     * 等待元素消失 返回true设定时间内消失 false超时未必消失
     * @param {any} selector 元素选择器 如 标签p .class #id 属性选择input[type="text"] 支持多元素.my-class.another-class 只返回第一个匹配的元素 用document.querySelectorAll可返回列表
     * @param {any} waitSecond 等待秒数 默认20秒
     * @param {any} beforeWaitShow 是否先等待元素显示再等待消失
     * @returns 返回false等待超时未消失
     */
    async waitNotExist(selector, waitSecond = 20, beforeWaitShow = false) {
        if (beforeWaitShow) {
            await this.waitElement(selector, 5);
        }
        //等待消失
        for (var i = 0; i < waitSecond * 2; i++) {
            if (this.stop) { break; }
            await this.sleep(500);
            var el = document.querySelector(selector);
            if (el == null) {
                return true;
            }
        }
        return false;
    },
    /**
    * 元素是否存在、可见 默认检查存在dom和style样式是否可见
    * @param {any} selector 元素选择器 如 标签p .class #id 属性选择input[type="text"] 支持多元素.my-class.another-class 只返回第一个匹配的元素 用document.querySelectorAll可返回列表
    * @param {any} checkStyle 检查样式是否可见 默认true
    * @param {any} checkVisible 检查在可视区域 默认false
    * @returns 返回true在 false不在
    */
    elementExistVisible(selector, checkStyle = true, checkVisible = false) {
        var el = document.querySelector(selector);
        var result = el !== null;

        if (result && checkStyle) {
            var style = window.getComputedStyle(el);
            result = style.visibility !== 'hidden' && style.display !== 'none';
        }

        if (result && checkVisible) {
            result = this.elementIsVisible(el, false);
        }
        return result;
    },
    /**
     * 等待元素出现在可视区域 使用方法: await rpa.waitElementVisible(el)
     * @param {any} el html元素
     * @param {any} waitSecond 等待秒数 默认20秒
     * @returns 返回true等到出现了
     */
    async waitElementVisible(el, waitSecond = 20) {
        //console.log(waitSecond); 
        for (var i = 0; i < waitSecond * 2; i++) {
            var r = this.elementIsVisible(el);
            if (r) {
                return true;
            }
            if (this.stop) { break; }
            await this.sleep(500);
        }
        return false;
    },
    /**
    * 元素在不在可视区域 是否可见
    * @param {any} el html元素
    * @param {any} checkStyle 检查样式是否可见 默认true
    * @returns 返回true在 false不在
    */
    elementIsVisible(el, checkStyle = true) {
        var rect = el.getBoundingClientRect();
        if (rect.width == 0 && rect.height == 0) {
            return false;
        }

        var result = (rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
        );

        if (result && checkStyle) {
            var style = window.getComputedStyle(el);
            result = style.visibility !== 'hidden' && style.display !== 'none';
        }

        return result;
    },
    /**
    * 移动滚动条看见指定元素
    * @param {any} el html元素
    * @param {any} block block垂直方向位置 start顶部 center中间默认 end底部
    * @param {any} checkVisible 是否检查当前可见 如果可见则不操作
   * @returns 返回true已在可视区域 false没验证不一定不在
    */
    elementMoveVisible(el, block = "center", checkVisible = false) {
        if (checkVisible && this.elementIsVisible(el)) {
            return true;
        }
        else {
            //文档：https://blog.csdn.net/u013299635/article/details/121419271
            //传true 就是顶部对齐 也是默认参数=scrollIntoViewOptions: {block: “start”, inline: “nearest”}
            //传false 就是底部对齐=scrollIntoViewOptions: {block: “end”, inline: “nearest”}
            /* 对象参数 block垂直方向 inline水平方向 start顶部 end底部对齐 center居中 behavior smooth平滑过渡动画
            behavior	[可选]定义过渡动画。“auto”,“instant"或"smooth”。默认为"auto"。
            block[可选] “start”，“center”，“end"或"nearest”。默认为"center"。
            inline[可选] “start”，“center”，“end"或"nearest”。默认为"nearest"。
            */
            //el.scrollIntoView();//顶部
            //el.scrollIntoView(false);//底部
            el.scrollIntoView({ block: block });//中间
            //el.scrollIntoView({ behavior: "instant", block: "end", inline: "nearest" });
        }
        return false;
    },

    /**
     * 输入文本 
     * @param {any} el html可输入文本元素
     * @param {any} content 文本内容
     */
    inputText(el, content) {
        //document.querySelector("#kw").value="王文忠"
        if (el) {
            //if ('value' in el) {
            //    el.focus();
            //    el.select();
            //    el.value = content                            //这种方式部分页面无效
            //} else {
            //命令名	作用	是否需要第三个参数	参数示例
            //insertHTML	插入 HTML 代码（你使用的命令）	是	"<img src='pic.jpg'>"、"<a href='url'>链接</a>"
            //insertText	插入纯文本（不会解析 HTML）	是	"Hello World"
            //insertImage	插入图片（部分浏览器需传图片 URL）	是	"pic.jpg"
            //insertLink	为选中文本添加超链接（需传 URL）	是	"https://example.com"
            //insertUnorderedList	插入无序列表（<ul>/<li>）	否	-
            //insertOrderedList	插入有序列表（<ol>/<li>）	否	-
            //insertHorizontalRule	插入水平线（<hr>）	否	-
            //undo	撤销上一步操作	否
            //redo	恢复撤销的操作	否
            //cut	剪切选中的内容到剪贴板	否
            //copy	复制选中的内容到剪贴板	否
            //paste	粘贴剪贴板内容（受浏览器权限限制）	否
            //delete 删除选中的内容	否
            //selectAll	选中编辑区域的所有内容	否
            //removeFormat	清除选中文本的所有格式	否
            //设置焦点并输入文本
            //el.focus();
            el.select();
            document.execCommand("insertText", "false", content);   //https://developer.mozilla.org/zh-CN/docs/Web/API/Document/execCommand
            //}
        }
    },
    /**
     * 鼠标单击 用cef鼠标事件
     * @param {any} el html元素
     * @param {any} useWinApi 是否使用真实鼠标操作
     * @param {any} useChildPoup 是否使用父子弹窗 
     */
    async clickCEF(el, useWinApi = false, useChildPoup = false) {
        var rec = el.getBoundingClientRect();
        await this.rpaApi.mouseClick(rec.left + rec.width / 2, rec.top + rec.height / 2, useWinApi, useChildPoup)
        await this.sleep(200);
    },
    /**
     * 鼠标单击并等待10秒指定元素出现 用cef鼠标事件
     * @param {any} el html元素
     * @param {any} selector 等待出现的元素选择器  
     */
    async clickCEFWait(el, selector) {
        this.clickCEF(el, false, false);
        for (var i = 0; i < 10; i++) {
            if (this.stop) { break; }
            await this.sleep(1000);
            var elItems = document.querySelectorAll(selector);
            if (elItems.length > 0) {
                return true;
            }
        }
        return false;
    },
    /**
     * 鼠标悬停
     * @param {any} el html元素
     * @param {any} useWinApi 是否使用真实鼠标操作 
     */
    async hoverCEF(el, useWinApi = false) {
        var rec = el.getBoundingClientRect();
        await this.rpaApi.mouseHover(rec.left + rec.width / 2, rec.top + rec.height / 2, useWinApi)
        await this.sleep(200);
    },

    /**
     * 模拟鼠标点击事件 部分页面无效
     * @param {*} element 触发的元素
     * @param {*} x 触发鼠标水平位置
     * @param {*} y 触发鼠标垂直位置
     */
    jsMouseClick(element, x = 0, y = 0) {
        if (x == 0 && y == 0) {
            const rect = element.getBoundingClientRect();
            // 以元素中心作为起始点
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }
        if (element && element.dispatchEvent) {
            // 触发事件
            element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,       // 事件是否冒泡
                cancelable: true,    // 事件是否可取消
                view: window,         // 关联的窗口对象
                clientX: x,           // 鼠标相对于浏览器可视区域左侧 不是相对触发元素 只表示触发事件时鼠标位置不管怎么设置都不影响事件触发 一般拖拽滑块才用到
                clientY: y,           // 鼠标相对于浏览器可视区域顶部
            }));
        }
    },
    // 模拟鼠标移动事件
    jsMouseDown(element, x = 0, y = 0) {
        if (x == 0 && y == 0) {
            const rect = element.getBoundingClientRect();
            // 以元素中心作为起始点
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }
        const event = new MouseEvent('mousedown', {
            bubbles: true,        // 允许事件向上冒泡，让父级元素能感知到事件
            cancelable: true,     // 事件是否可以取消
            // view: window,         // 关联的窗口对象
            clientX: x,           // 鼠标相对于浏览器可视区域左侧 不是相对触发元素 只表示触发事件时鼠标位置不管怎么设置都不影响事件触发 一般拖拽滑块才用到
            clientY: y,           // 鼠标相对于浏览器可视区域顶部
            button: 0,            // 0表示左键，1表示中键，2表示右键 
        });
        element.dispatchEvent(event);   // 在element元素触发事件 会向上冒泡到父元素、body、document 等
    },
    // 模拟鼠标移动事件
    jsMouseMove(element, x = 0, y = 0) {
        const event = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        element.dispatchEvent(event);
    },
    // 模拟鼠标弹起事件
    jsMouseUp(element, x = 0, y = 0) {
        if (x == 0 && y == 0) {
            const rect = element.getBoundingClientRect();
            // 以元素中心作为起始点
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }
        const event = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 0
        });
        element.dispatchEvent(event);
    },

    /**
     * 从元素库获取元素并抓取 并在调用的dom中抓取 返回抓取到的元素集合 从元素库找元素时可匹配名字一样应用id为当前id或者为null的未知应用
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

    //#endregion

    //#region 原rpaDev开始

    intervalPtr: 0,                 //计时器标识
    selectElement: null,        //最近一次抓取的元素 
    //当前编辑的元素id 
    editId: -1,
    //最近一次抓取并保存的元素
    lastSaveGrabElement: null,
    //最近一次抓取的元素所有父级元素暂存 [{ el: tempElement, oldClassName: tempElement.className }]
    selectElementParentNodes: [],
    //抓取元素开始
    async grabElementStart(editId = -1) {
        try {
            if (this.intervalPtr != 0) {
                return;
            }
            //console.log("开始抓取元素");

            this.editId = editId;

            var mouseX = -10; // 鼠标相对于浏览器窗口的水平位置
            var mouseY = -10; // 鼠标相对于浏览器窗口的垂直位置
            document.onmousemove = function (event) {
                mouseX = event.clientX;
                mouseY = event.clientY;
                //console.log('鼠标位置：', mouseX, mouseY);
            };
            var that = this;
            //console.log('that：', that);
            if (!this.intervalPtr) {
                this.intervalPtr = setInterval(async function () {
                    //坐标对应的元素
                    var el = document.elementFromPoint(mouseX, mouseY);
                    that.selectElement = el;
                    //console.log('指向元素：', that.selectElement);
                    if (el) {
                        var rect = el.getBoundingClientRect();
                        var rectArr = [];
                        rectArr.push(rect);
                        if (await ____rpaName____.rpaApi.drawHtmlElementRect(JSON.stringify(rectArr), false) == "停止抓取元素") {
                            that.grabElementEnd(false);
                        }
                    }
                }, 200);
            }
        } catch (e) {

        }
        return;
    },
    //抓取元素结束 opMode=true确定抓取 false取消
    grabElementEnd(opMode = false) {
        try {
            //防止结束重复操作
            if (!this.intervalPtr || !this.selectElement) {
                return;
            }

            clearInterval(this.intervalPtr);
            this.intervalPtr = 0;

            if (opMode) {
                if (this.debug) {
                    console.log("本次抓取到元素：", this.selectElement, "\n类名：", this.selectElement.className);
                }
                //停止抓取并保存元素信息
                ____rpaName____.rpaApi.stopDrawHtmlElementRect();
                this.grabElementSelector(this.selectElement);
            } else {
                if (this.debug) {
                    //console.log("取消抓取元素");
                }
                this.selectElement = null;
                ____rpaName____.rpaApi.stopDrawHtmlElementRect();
            }
        } catch (e) {
            if (this.debug) {
                console.error("处理抓取元素信息出错：", e);
            }
        }
    },
    //抓取元素处理筛选处理
    async grabElementSelector(el) {
        var that = this;
        try {
            if (!el) { return; }
            //if (el.className && el.className.trim()) {
            //    var selector1 = "." + el.className.replaceAll(" ", ".");
            //    var selector1Items = document.querySelectorAll(selector1);
            //    console.log('单层选择器：' + selector1 + "，检测元素数：" + selector1Items.length);
            //}
            var name = "";
            //var selector2 = "";                 //好像不用了
            var elNodeArr = [];
            var tempElement = el;
            this.selectElementParentNodes.splice(0, this.selectElementParentNodes.length);            //清空历史
            //向元素顶层取20层元素直到body
            for (var i = 0; i < 21; i++) {
                try {
                    if (tempElement) {
                        if (tempElement.tagName == "BODY") {
                            if (this.debug) {
                                console.log("已经检查到body停止");
                            }
                            break;
                        }

                        var idAttr = tempElement.id;
                        //class名字 标准格式 class1 class2
                        var className = "";
                        var nodeNum = 0;
                        var nodeIndex = 0;                      //默认按当前元素在父容器下标
                        var classIndex = -1;                     //当前元素className筛选得出下标
                        var tagName = tempElement.tagName.trim().toLowerCase();
                        var innerText = tempElement.childNodes.length == 1 && tempElement.childNodes[0].nodeName == "#text" ? tempElement.innerText : ""; //没有其他子节点则记录文本
                        //优先用选中节点内部文本做名字
                        if (i == 0 && innerText) {
                            name = tagName + "_" + innerText;
                        }

                        //class选择器针对一些特殊情况处理
                        if (tempElement.className && tempElement.className.trim) {
                            className = tempElement.className.trim();
                        }
                        else if (typeof tempElement.className === 'object' && tempElement.className.baseVal) {
                            //有些svg标签className会出现对象
                            className = tempElement.className.baseVal;
                        }
                        //将html元素类名规范成 "xxxxx xxxxx"
                        className = this.handleClassSelector(className);

                        //处理多元素下标 最后一个元素没有类筛选器 检查父节点是否存在多个元素
                        //if (i == 0 && tempElement.parentElement) {
                        if (tempElement.parentElement) {
                            try {
                                var tempTagName = tempElement.tagName.trim().toLowerCase();
                                var elClassNodes = tempElement.parentElement.querySelectorAll(tempTagName);
                                nodeNum = elClassNodes.length;
                                for (var j = 0; j < elClassNodes.length; j++) {
                                    //if (elClassNodes[j].innerHTML === tempElement.innerHTML) {
                                    if (elClassNodes[j] === tempElement) {
                                        nodeIndex = j;                              //获取当前筛选器匹配多少个元素 并记录当前元素是第几个
                                        break;
                                    }
                                }
                            } catch (exex) {
                                if (this.debug) {
                                    console.error('处理无类筛选器多元素下标出错：', exex);
                                }
                            }
                        }
                        //拼接多层嵌套class尝试抓取到唯一元素
                        if (className) {
                            //处理元素名
                            if (!name) {
                                name = tagName + "." + className.replaceAll(" ", ".");
                            }
                            //检查仅用class选择器获取到元素列表 获取当前元素所在下标 优先从父元素筛选
                            var classNameSelector = "." + className.replaceAll(" ", ".");
                            //if (!classNameSelector) {
                            //    continue;
                            //}
                            var elClassNodes = document.querySelectorAll(classNameSelector);
                            nodeNum = elClassNodes.length;
                            for (var j = 0; j < elClassNodes.length && elClassNodes.length > 1; j++) {
                                //if (elClassNodes[j].innerHTML === tempElement.innerHTML) {
                                if (elClassNodes[j] === tempElement) {
                                    classIndex = j;                              //获取当前筛选器匹配多少个元素 并记录当前元素是第几个
                                    break;
                                }
                            }
                        }

                        //检查其他自定义属性
                        var tagAttrs = [];
                        for (var j = 0; j < tempElement.attributes.length; j++) {
                            var attr = tempElement.attributes[j];
                            var attrVal = attr.value.trim();
                            //标签自带属性不支持筛选 需要手动过滤
                            // if (attr.name == "src" || attr.name == "href" || attr.name == "style") {
                            if (attr.name == "style") {
                                //if (this.debug) {
                                //    console.log("跳过属性：", attr);
                                //}
                                continue;
                            }

                            if (attr.name == "id") {
                                var idName = this.handleClassSelector(attrVal)
                                if (this.validateIdName(idName)) {
                                    tagAttrs.push({
                                        name: "id",
                                        value: idName,
                                        selected: true,
                                        attrMatchRule: 'equal',
                                        desc: '勾选此项会根据idName匹配元素 一般都是页面唯一值比较准确'
                                    });
                                }
                                continue;
                            }
                            if (attr.name == "class" && this.validateClassName(className)) {
                                tagAttrs.push({
                                    name: "class",
                                    value: className,
                                    selected: true,
                                    attrMatchRule: 'equal',
                                    desc: '勾选此项会根据className匹配元素 需注意鼠标悬停状态可能会变动 抓取元素后2秒内鼠标移动一下程序会再次对比元素特征变动若变动会弹窗提示'
                                });
                                // }
                                continue;
                            }

                            //只要有值的属性全部加入 但不默认选择
                            if (attrVal && !attrVal.includes(`"`) && !attrVal.includes(`'`)) {
                                tagAttrs.push({
                                    name: attr.name,
                                    value: attrVal,
                                    selected: false,
                                    attrMatchRule: 'equal',
                                    customAttr: true,
                                    desc: '不常用筛选属性谨慎勾选 可能无法准确匹配元素'
                                });
                            }
                        }
                        //添加innerText属性
                        if (innerText && i == 0) {
                            tagAttrs.push({
                                name: "innerText",
                                value: innerText,
                                selected: false,
                                attrMatchRule: 'equal',
                                desc: '勾选此项会根据innerText相等匹配元素 但多语言页面不适合用'
                                //selected: nodeNum > 0 ? true : false,   //不支持父元素 如果抓点击按钮追求准确性建议为true 如果是为了抓可变数据则为false 有多个使用下标抓
                            });
                        }
                        //添加下标过滤属性
                        if (nodeNum > 1) {
                            let desc = '勾选此项会根据数组下标匹配元素 ';
                            desc += ` 父容器下标为：${nodeIndex}`
                            if (classIndex != -1) {
                                desc += ` className筛选下标为：${classIndex}`
                            }
                            tagAttrs.push({
                                name: "index",
                                value: nodeIndex,
                                selected: false,
                                attrMatchRule: 'equal',
                                desc
                                //selected: nodeNum > 0 && !innerText ? true : false,     //如果抓点击按钮追求准确性建议为true 如果是为了抓可变数据则为false 有多个使用下标抓
                            });
                        }

                        //没id class 自定义属性则不记录
                        if (i > 0 && tagAttrs.length == 0) {
                            //继续检查父层元素 并增加一次机会
                            tempElement = tempElement.parentElement;
                            i--;
                            continue;
                        }

                        //处理节点名字
                        var nodeName = tagName;
                        if (idAttr) {
                            nodeName = nodeName + "#" + idAttr;
                        }
                        if (className) {
                            nodeName = nodeName + "." + className;
                        }
                        //优化属性排序id class index innerText优先
                        let tempTagAttrs = this.sortTagAttrs(tagAttrs)
                        //记录节点信息 高级筛选 同级支持标签ID类名查如：document.querySelectorAll("DIV#s_top_wrap.s-isindex-wrap") 最终查询生成一个js方法获取每一级节点
                        elNodeArr.push({
                            id: idAttr,
                            name: nodeName,
                            tag: tagName,
                            class: className,
                            index: nodeIndex,                       //可当抓取时默认值用
                            text: innerText,                           //可当抓取时默认值用
                            selected: false,
                            attrs: tempTagAttrs,
                        });
                        //记录父节点
                        this.selectElementParentNodes.push({ el: tempElement, oldClassName: tempElement.className });
                    } else {
                        ////无父层元素
                        //break;
                    }

                    ////开始检查元素能否找到唯一的 提前停止
                    //var checkItems = document.querySelectorAll(selector2);
                    //if (checkItems.length == 1) {
                    //    //检测到唯一选择器
                    //    break;
                    //} 
                } catch (e) {
                    if (this.debug) {
                        console.error("读取父层元素信息出错：", e,);
                        console.log('出错元素：', tempElement);
                    }
                }

                //继续检查父层元素
                if (tempElement && tempElement.parentElement) {
                    tempElement = tempElement.parentElement;
                }
                else {
                    //无父层元素
                    break;
                }
            }

            //最终检查调优给出个默认筛选方案 默认选中id class
            if (this.debug) {
                console.log(`开始检查整理最佳默认筛选方案 共${elNodeArr.length}层元素……`);
            }
            var checkSuccess = false;
            var exeResult = {};
            try {
                //更新顶层节点下标
                let actionUpdateIndex = (newIndex) => {
                    if (newIndex == -1) {
                        return
                    }
                    if (elNodeArr.length > 0 && elNodeArr[0].attrs.length > 0) {
                        let attrIndexs = elNodeArr[0].attrs.filter(w => w.name == "index")
                        if (attrIndexs.length > 0) {
                            attrIndexs[0].value = newIndex                      //每次检测更新实际检测下标
                        }
                    }
                }
                //每加一层节点检查一次直到匹配到唯一元素为止
                for (var i = 0; i < elNodeArr.length; i++) {
                    var item = elNodeArr[i];
                    item.selected = true;
                    //先只用class尝试
                    exeResult = await this.checkElement(elNodeArr);
                    actionUpdateIndex(exeResult.checkIndex);
                    if (exeResult.grabNodeNum == 1) {
                        //console.log("筛选成功：", exeResult);
                        checkSuccess = true;
                        break;
                    }
                    ////若有id再加id尝试 默认已加id
                    //if (item.attrs.filter(w => w.name == 'id').length > 0) {
                    //    item.attrs.filter(w => w.name == 'id')[0].selected = true;
                    //    exeResult = await this.checkElement(elNodeArr);
                    //    actionUpdateIndex(exeResult.checkIndex);
                    //    if (exeResult.grabNodeNum == 1) {
                    //        //console.log("加id后筛选成功：", exeResult);
                    //        checkSuccess = true;
                    //        break;
                    //    }
                    //}
                }
                //筛选到多个元素无法定位 尝试加上innerText
                if (!checkSuccess && elNodeArr.length > 0 && elNodeArr[0].attrs.filter(w => w.name == 'innerText').length > 0) {
                    var item = elNodeArr[0];
                    for (var j = 0; j < item.attrs.length; j++) {
                        var itemAttr = item.attrs[j];
                        if (itemAttr.name == "innerText") {
                            itemAttr.selected = true;
                            break;
                        }
                    }
                    exeResult = await this.checkElement(elNodeArr);
                    actionUpdateIndex(exeResult.checkIndex);
                    if (exeResult.grabNodeNum == 1) {
                        //console.log("加id innerText后筛选成功：", exeResult);
                        checkSuccess = true;
                    }
                }

                //var selector2Items = document.querySelectorAll(selector2);
                //console.log('多层选择器：' + selector2 + "，检测元素数：" + selector2Items.length);
                //console.log("检测节点：", selector2Items);
                //console.log("节点信息：", elNodeArr);
            } catch (e) {
                if (this.debug) {
                    console.error("检测筛选默认选择器出错：", e);
                }
            }
            //保存结果
            this.lastSaveGrabElement = {
                elName: name,
                checkOk: checkSuccess,
                jsSelector: exeResult.grabFunction,
                querySelector: exeResult.querySelector,
                checkResult: exeResult,
                elNodes: elNodeArr,
            }
            if (this.debug) {
                console.log("保存本次筛选结果：", this.lastSaveGrabElement);
            }
            this.rpaApi.saveElementSelector(JSON.stringify(this.lastSaveGrabElement), this.editId);

            //检测对比鼠标不悬停状态元素className 抓取结束2秒后再次检查 
            if (this.selectElementParentNodes) {
                setTimeout(async () => {
                    let checkResult = true;
                    for (let node of this.selectElementParentNodes) {
                        if (node.el.className && node.oldClassName && node.el.className != node.oldClassName) {
                            checkResult = false;
                            break;
                        }
                    }
                    if (!checkResult) {
                        if (await that.rpaApi.showMessageBox("检测到刚抓取的元素在鼠标离开后有变动是否重新加载鼠标离开状态特征，否则可能造成鼠标悬停状态下才能捕获到此元素！！！", "操作确认", 4, 32) == 6) {
                            that.grabElementSelector(that.selectElement);
                        }
                    }
                }, 2000);
            }
        } catch (e) {
            if (this.debug) {
                console.error("解析元素错误", e)
            }
            return;
        }
    },
    //按指定name优先级排序数组 
    sortTagAttrs(originalArr) {
        // 1. 定义优先级映射：key为name，value为优先级（数值越小优先级越高）
        const priorityMap = {
            id: 1,
            class: 2,
            index: 3,
            innerText: 4,
        };
        // 2. 分桶：存放指定优先级的元素和其他元素
        const priorityElements = {}; // 存储指定优先级的元素 { id: {}, class: {}... }
        const otherElements = []; // 存储其他name的元素（按原顺序）

        // 3. 遍历原数组，填充分桶
        originalArr.forEach(item => {
            const { name } = item;
            if (priorityMap.hasOwnProperty(name)) {
                // 若为指定优先级的name，存入对应键（去重，若有重复name只保留最后一个）
                priorityElements[name] = item;
            } else {
                // 其他name按原顺序存入
                otherElements.push(item);
            }
        });

        // 4. 按优先级顺序生成排序后的指定元素数组（自动跳过不存在的name，如id）
        const sortedPriorityElements = [
            priorityElements.id,
            priorityElements.class,
            priorityElements.index,
            priorityElements.innerText,
        ].filter(Boolean); // 过滤掉undefined（即不存在的name）

        // 5. 合并：优先级元素在前，其他元素按原顺序在后
        const tempTagAttrs = [...sortedPriorityElements, ...otherElements];
        return tempTagAttrs;
    },
    //检查元素最佳匹配条件 若在最后一个元素筛选innerText则在末尾加.filter(w => w.innerText == 'value')
    async checkElement(nodes, showRect = false) {
        try {
            //元素顺序 0是选择的元素 后面都是父元素父元素
            let elNodeArr = [];
            for (let i = 0; i < nodes.length; i++) {
                let item = nodes[i];
                if (item.selected) {
                    elNodeArr.push(item);
                }
            }
            if (elNodeArr.length == 0) {
                return {
                    grabNodeNum: 0,
                    grabFunction: "",
                };
            }

            //最后一次querySelectorAll是否使用innerText过滤
            let lastNodeInnerText = "";
            //多层节点选择器js
            let code = `document.querySelectorAll("`;
            //常用拼接方法
            let joinFunc = function (sourceStr, str) {
                //靠近"开始的不要加空格
                if (sourceStr.endsWith(`querySelectorAll("`)) {
                    sourceStr += str;
                } else {
                    sourceStr += " " + str;
                }
                return sourceStr;
            };
            for (let i = elNodeArr.length - 1; i >= 0; i--) {
                let item = elNodeArr[i];

                //console.log("处理节点：", item);
                //当前节点选择器
                let nodeSelector = "";
                let attrIndex = -1;
                let attrInnetText = "";
                for (let j = 0; j < item.attrs.length; j++) {
                    let attrItem = item.attrs[j];
                    if (!attrItem.selected) {
                        continue;
                    }
                    switch (attrItem.name) {
                        case "id":
                            nodeSelector = nodeSelector + ("#" + attrItem.value.replaceAll("\\", "\\\\"));
                            break;
                        case "class":
                            nodeSelector = nodeSelector + ("." + attrItem.value.replaceAll(" ", ".").replaceAll("\\", "\\\\"));                          //特殊符号转义符号\需要改成\\
                            break;
                        case "index":
                            //当前节点有使用下标 只用class选择器可筛选到的元素数
                            attrIndex = parseInt(attrItem.value);
                            break;
                        case "innerText":
                            attrInnetText = attrItem.value;
                            break;
                        default:
                            if (attrItem.name) {
                                if (!attrItem.value) { attrItem.value = '' }
                                //其他情况都当自定义属性处理 equal是相等
                                switch (attrItem.attrMatchRule) {
                                    case "startWith": nodeSelector = nodeSelector + (`[` + attrItem.name + `^='` + attrItem.value + `']`);
                                        break;
                                    case "endWith": nodeSelector = nodeSelector + (`[` + attrItem.name + `$='` + attrItem.value + `']`);
                                        break;
                                    case "contains": nodeSelector = nodeSelector + (`[` + attrItem.name + `*='` + attrItem.value + `']`);
                                        break;
                                    default:
                                        nodeSelector = nodeSelector + (`[` + attrItem.name + `='` + attrItem.value + `']`);
                                }
                                break;
                            }
                        //[attr^= "val"]：属性值以 val 开头
                        //[attr$= "val"]：属性值以 val 结尾
                        //[attr*= "val"]：属性值包含 val
                    }
                }
                //console.log("生成的选择器：" + nodeSelector);

                //没有使用选择器 如果不是父元素则可使用标签
                if (!nodeSelector) {
                    if (i == 0) {
                        nodeSelector = item.tag;
                    } else {
                        continue;
                    }
                }
                //是否使用index筛选
                if (attrIndex != -1) {
                    //下标过滤支持父层元素 先中断css选择器拼接
                    if (i == 0) {
                        //最后一层节点不用再拼.querySelectorAll(
                        code = joinFunc(code, `${nodeSelector}")[${attrIndex}]`);
                    } else {
                        code = joinFunc(code, `${nodeSelector}")[${attrIndex}].querySelectorAll("`);
                    }
                } else {
                    //不使用下标过滤 此处在最后一次query时不应该只取第一个 也就是说最终取的元素数可能是多个
                    if (i == 0) {
                        if (attrInnetText) {
                            lastNodeInnerText = attrInnetText;
                        }
                        //最后一层拼)结束
                        code = joinFunc(code, `${nodeSelector}")`);
                    } else {
                        //code += ` ${nodeSelector}`;
                        code = joinFunc(code, `${nodeSelector}`);
                    }
                }
            }

            if (code) {
                try {
                    //最后一次querySelectorAll是否使用innerText过滤js拼接 
                    let returnQuerySelector = code;
                    if (lastNodeInnerText) {
                        returnQuerySelector = `Array.from(${code}).filter(w => w.innerText == "${lastNodeInnerText}");`;
                    }

                    let evalJs = `function () {
    return ${returnQuerySelector}
    }`;
                    if (this.debug) {
                        console.log("最终筛选JS：", returnQuerySelector);
                    }
                    //执行测试 正式使用需要注意的是拼接的js抓取的元素是元素数组 如果最后一个设置了index筛选则返回单个元素 需要统一成数组
                    let evalResult = eval(`(` + evalJs + `)();`);
                    let elements = [];
                    if (evalResult) {
                        if (evalResult.constructor.name === "NodeList" || evalResult.constructor.name === "Array") {
                            evalResult.forEach(function (item) {
                                elements.push(item);
                            });
                        } else {
                            elements.push(evalResult);
                        }
                    }

                    if (this.debug) {
                        console.log("执行最终JS返回的结果：", elements);
                    }

                    if (showRect) {
                        let rectArr = [];
                        for (let i = 0; i < elements.length && i < 40; i++) {
                            let el = elements[i];
                            //等待元素出现再继续 此处比较耗时间 数量过多则不验证可见
                            if (elements.length < 3) {
                                await this.waitElementVisible(el, 3);
                            }
                            if (el) {
                                let rect = el.getBoundingClientRect();
                                rectArr.push(rect);
                            }
                        }
                        await ____rpaName____.rpaApi.drawHtmlElementRect(JSON.stringify(rectArr), true);
                    }

                    let checkIndex = -1
                    if (elements.length > 1 && this.selectElementParentNodes.length > 0) {
                        for (var i = 0; i < elements.length; i++) {
                            if (this.selectElementParentNodes[0].el == elements[i]) {
                                checkIndex = i
                                break;
                            }
                        }
                    }
                    return {
                        checkIndex,
                        grabNodeNum: elements.length,
                        grabFunction: evalJs,
                        querySelector: returnQuerySelector
                    };
                } catch (e) {
                    if (this.debug) {
                        console.log("检测抓取元素出错：", e);
                    }
                }
            }

            return {
                grabNodeNum: 0,
                grabFunction: "",
            };
        } catch (e) {
            if (this.debug) {
                console.error("检测元素出错", e);
            }
            return null;
        }
    },
    //处理合法筛选类名 返回 "xxx xxxx" id名也可用
    handleClassSelector(input) {
        try {
            if (!input) {
                return null;
            }
            // 1. 将所有换行符和多个连续空格转换为单个空格
            let processed = input.replace(/[\s\n]+/g, ' ');
            // 2. 去除字符串首尾的空格
            processed = processed.trim();

            //处理需要转义的特殊字符串 
            const specialChars = {
                '#': '\\#',
                '.': '\\.',
                ':': '\\:',
                '*': '\\*',
                '(': '\\(',
                ')': '\\)',
                '[': '\\[',
                ']': '\\]',
                '!': '\\!',
                '$': '\\$',
                '%': '\\%',
                '&': '\\&',
                "'": "\\'",
                '+': '\\+',
                ',': '\\,',
                '/': '\\/',
                ';': '\\;',
                '=': '\\=',
                '?': '\\?',
                '@': '\\@',
                '^': '\\^',
                '`': '\\`',
                '{': '\\{',
                '|': '\\|',
                '}': '\\}',
                '~': '\\~'
            };
            // 按空格分割类名
            const classes = processed.split(/\s+/).filter(Boolean);
            // 处理每个类名中的特殊字符
            const escapedClasses = classes.map(className => {
                let escaped = '';
                for (const char of className) {
                    // 如果是特殊字符则使用转义后的值，否则直接使用原字符
                    escaped += specialChars[char] || char;
                }
                return escaped;
            });
            // 重新组合成字符串
            return escapedClasses.join(' ');

            //return processed;

            //以下是直接处理成 ".xxxxx.xxxxx"
            //// 1. 将所有空格、换行符等空白字符转换为点
            //let processed = input.replace(/\s+/g, '.');
            //// 2. 合并多个连续的点为单个点
            //processed = processed.replace(/\.+/g, '.');
            //// 3. 移除结尾的点
            //processed = processed.replace(/\.$/, '');
            //// 4. 确保选择器以点开头（如果处理后为空则保持空）
            //if (processed && !processed.startsWith('.')) {
            //    processed = '.' + processed;
            //}
            //// 5. 验证处理后的结果是否有效
            //if (processed === '' || processed === '.') {
            //    throw new Error('无效的选择器：处理后为空或仅包含点');
            //}
            //// 检查是否包含CSS类选择器的非法字符
            //// 合法字符：字母、数字、下划线、连字符以及点（用于多类选择）
            //const invalidChars = /[^a-zA-Z0-9_\-.]/g;
            //if (invalidChars.test(processed)) {
            //    const invalid = [...new Set(processed.match(invalidChars))];
            //    throw new Error(`选择器包含非法字符：${invalid.join('、')}`);
            //} 
            //return processed;
        } catch (e) {
            if (this.debug) {
                console.error(`处理类筛选器：${input} 错误：`, e);
            }
        }
        return null;
    },
    //验证html属性class值命名 "xxx xxxx" id名也可用但不能以数字开头 类名可以数字开头
    validateClassName(className) {
        // 示例
        // console.log(validateClassName("my-class")); // true
        // console.log(validateClassName("123-class")); // false, 不能以数字开头
        // console.log(validateClassName("class-")); // false, 不能以连字符结尾
        // console.log(validateClassName("class!name")); // false, 包含非法字符
        // return true;

        // console.info("验证类名：", className);
        if (!className) {
            return false;
        }

        //const regex = /^[a-z][a-z0-9\-]*$/;
        //const regex = /^[a-z][a-z0-9_\-]*$/;        //增加_连字符
        const regex = /^[a-zA-Z0-9_\-](?:[a-zA-Z0-9_\-]|\\[^\s])*$/;    //增加包含“\[”这些转义符 1. 支持字母、数字、下划线、连字符 2. 支持转义的特殊字符（如 \.、\# 等）3. 不允许包含空格

        if (className.includes(" ")) {
            //拆分单个验证
            var tempArr = className.split(" ");
            for (let i = 0; i < tempArr.length; i++) {
                const item = tempArr[i];
                if (item.trim()) {
                    if (!regex.test(item)) {
                        if (this.debug) {
                            console.log('检查到无效className筛选器：', item);
                        }
                        return false;
                    }
                }
            }
        } else {
            if (!regex.test(className)) {
                if (this.debug) {
                    console.log('检查到无效className筛选器：', className);
                }
                return false;
            }
        }
        return true;
    },
    //验证html属性id值命名 不能以数字开头
    validateIdName(idName) {
        // 测试
        // console.log(isValidHtmlId("id123")); // true
        // console.log(isValidHtmlId("123id")); // false, 不以字母或下划线开始
        // console.log(isValidHtmlId("id-name")); // true
        // console.log(isValidHtmlId("id_name")); // true
        // console.log(isValidHtmlId("id!name")); // false, 包含非法字符
        if (!idName) {
            return false;
        }

        //const regex = /^[a-z][a-z0-9-_]*$/i

        // 验证ID选择器名称的正则表达式
        // 规则：
        // 1. 不能以数字开头
        // 2. 支持字母、数字、下划线(_)、连字符(-)
        // 3. 支持转义的特殊字符（如 \#、\. 等）
        // 4. 不允许包含空格
        const regex = /^[a-zA-Z_-](?:[a-zA-Z0-9_-]|\\[^\s])*$/;
        if (!regex.test(idName)) {
            if (this.debug) {
                console.log('检查到无效idName筛选器：', idName);
            }
            return false;
        }
        return true
    },

    //接受其他页面传来检测元素json
    async checkElementJson(json, showRect) {
        try {
            if (this.debug) {
                console.log("接受到校验元素：", JSON.parse(json));
            }
            await this.sleep(200);
            return JSON.stringify(await this.checkElement(JSON.parse(json), showRect));
        } catch (e) {
            return null;
        }
    },

    //#endregion

}

//重写window.open
____rpaName____.overrideWindowOpen();
if (window.____rpaApiName____) {
    ____rpaName____.rpaApi = window.____rpaApiName____                                  //在其他环境尝试赋值一下
}
if (____rpaName____.debug) {
    console.log('rpa加载完成');
}