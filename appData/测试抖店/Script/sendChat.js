/************************************私信自动发消息*************************************** */
var rpa = window.____rpaName____;
rpa.runMessageWriteRunLog = true;

var storeSendChat = {
    selectorSend: ".arco-btn.arco-btn-primary.arco-btn-size-small.arco-btn-shape-square.m4b-button",
    chatMsgItems: [{ "type": 'text', "content": 'hi' }],
    intervalSecond: 1,
    skipChated: false,        //跳过已沟通
    skipReply: false,         //跳过回复
    skipDays: 0,              //跳过天数
    creatorName: "x",         //当前操作的达人名称
    sendBeforeFailTime: 0,    //每次发送前失败次数
    sendSuccessTime: 0,       //本次发送次数

    /**
     * 初始设置 并开始任务 storeSendChat.setChatConfigRun(1, 1, false, true, [{"id": 1, "type": 'text', "content": 'hi'},{"id": 3, "type": 'product', "content": '1730305900123490499'}], "")
     * @param {*} status 1执行中
     * @param {*} second 秒数
     * @param {*} skip true有消息都跳过
     * @param {*} skipReply true有回复跳过
     * @param {*} msgItems json对象
     * @param {*} name 当前操作的达人名
     */
    async setChatConfigRun(params = null) {
        if (!params) {
            return
        }
        params = JSON.parse(params);
        console.info("收到参数：", params);
        this.creatorName = params.creatorName;
        this.intervalSecond = params.intervalSecond;
        this.skipChated = params.skipChated;
        this.skipReply = params.skipReply;
        this.skipDays = params.skipDays;
        this.chatMsgItems = params.msgItems;
        this.sendSuccessTime = 0;

        var msg = await this.startSend();
        return JSON.stringify({ sucNum: this.sendSuccessTime, msg });
    },
    //开始发送
    async startSend() {
        try {
            // //获取消息参数
            // storeSendChat.chatMsgItems = JSON.parse(storeSendChat.getChatInitContentV2());

            await rpa.waitElement('.chatd-message', 20);

            //等待切换到当前要发送的达人
            let creatorName = ''
            var verifyCreatorName = false;
            for (let c = 0; c < 2 * 20; c++) {
                creatorName = await storeSendChat.getCurrFormName();
                if (creatorName && creatorName.trim() == storeSendChat.creatorName.trim()) {
                    verifyCreatorName = true;
                    break
                }
                await rpa.sleep(500);           //等待一段时间切换达人
            }
            if (!verifyCreatorName) {
                return '打开达人私信窗口失败 未匹配到当前要发送的达人';
            }

            //获取消息记录检查是否需要跳过 默认有一条消息 
            await rpa.sleep(1000);
            var elMsgItems = document.querySelectorAll(".chatd-message");
            var userMsgs = [];
            for (var i = 0; i < elMsgItems.length; i++) {
                var item = elMsgItems[i];
                if (!item.outerHTML.includes('chatd-systemMessage-content')) {
                    userMsgs.push(item);
                }
            }
            let lastMsgTime = null
            let lastSendTime = null
            if (userMsgs.length > 0) {
                if (storeSendChat.skipChated) {
                    //跳过有沟通记录的
                    return "已沟通过";
                }
                if (storeSendChat.skipReply) {
                    //跳过有沟通并回复的
                    if (userMsgs[userMsgs.length - 1].className.includes('chatd-message--left')) {
                        return "已沟通有消息待回复";
                    }
                }
                try {
                    // let lastMsgTimeStr = userMsgs[userMsgs.length - 1].querySelector('.chatd-time').innerText
                    // lastMsgTime = chatTimeParser.parse(lastMsgTimeStr)
                    // console.log('最后一条消息时间：', lastMsgTime)
                    //包含chatd-message--right是商家消息 包含chatd-message--left是达人消息
                    let sendMsgs = userMsgs.filter(w => w.className.includes('chatd-message--right'))
                    if (sendMsgs.length > 0) {
                        let elChatdTime = sendMsgs[sendMsgs.length - 1].querySelector('.chatd-time')
                        if (elChatdTime) {
                            let lastSendTimeStr = sendMsgs[sendMsgs.length - 1].querySelector('.chatd-time').innerText
                            lastSendTime = chatTimeParser.parse(lastSendTimeStr)
                            console.log('最后一次发送消息时间：', lastSendTime)
                        }
                    }
                } catch (error) {
                    await rpa.sleep(5000);
                    console.error('解析页面时间出错：', error)
                }
            }

            //检查超过5条消息不可再发
            if (!(await storeSendChat.checkLimit5Msg())) {
                return "消息超过5条限制";
            }

            //等待发送按钮出现 
            var btnSend = await rpa.waitElement(this.selectorSend, 40);
            if (!btnSend) {
                return '未找到发送按钮'
            }

            //再次检查跳过指定天数内跳过 不一定能取到页面发送时间
            if (lastSendTime && chatTimeParser.addDays(lastSendTime, this.skipDays) >= new Date()) {
                return "最近一次发消息时间在过滤天数内 跳过";
            }

            //弹窗处理 点击美区规则关闭按钮
            try {
                var btnUsCloseItems = document.querySelectorAll(".arco-icon.arco-icon-close");
                for (var i = 0; i < btnUsCloseItems.length; i++) {
                    var btnClose = btnUsCloseItems[i];
                    rpa.clickCEF(btnClose);
                    await rpa.sleep(500);
                }
                //美区出现一次的 点取消按钮 document.querySelectorAll(".arco-btn.arco-btn-secondary.arco-btn-size-large.arco-btn-shape-square");
                var btnUsCancelItems = document.querySelectorAll(".arco-btn.arco-btn-secondary.arco-btn-size-large.arco-btn-shape-square");
                for (var i = 0; i < btnUsCancelItems.length; i++) {
                    var btnCancel = btnUsCancelItems[i];
                    rpa.clickCEF(btnCancel);
                    await rpa.sleep(500);
                }

                //点击 arco-btn arco-btn-primary arco-btn-size-default arco-btn-shape-square m4b-button flex-c -ml-12
                var btn1 = document.querySelectorAll(".arco-btn-size-default.arco-btn-shape-square.m4b-button");
                if (btn1 && btn1.length == 2) {
                    rpa.clickCEF(btn1[0]);
                    await rpa.sleep(2000);
                }
                var btn2 = document.querySelectorAll(".sc-kAyceB.kHQiDA");
                if (btn2.length == 1) {
                    rpa.clickCEF(btn2[0]);
                    await rpa.sleep(2000);
                }
                btn1 = document.querySelectorAll(".arco-btn-size-default.arco-btn-shape-square.m4b-button");
                if (btn1 && btn1.length > 0) {
                    rpa.clickCEF(btn1[0]);
                    await rpa.sleep(2000);
                }
            } catch (error) {

            }

            //获取当前窗口人名
            storeSendChat.writeLog(creatorName + ' 开始发私信……');
            //开始发送
            var result = false;
            //开始发消息
            var isFirst = true;
            for (var i = 0; i < storeSendChat.chatMsgItems.length; i++) {
                var item = storeSendChat.chatMsgItems[i];

                if (!(await storeSendChat.checkLimit5Msg())) {
                    // await rpa.sleep(2000);
                    return "消息超过5条限制";
                }
                //每次发送前检查失败消息数
                this.sendBeforeFailTime = document.querySelectorAll(".chatd-message-status-content--failed").length
                try {
                    switch (item.type) {
                        case "image":
                            await storeSendChat.sendImage(item.imageUrl);
                            break;
                        case "text":
                            var content = item.content;

                            //达人名称占位符
                            if (item.content.includes("{{nickName}}")) {
                                content = item.content.replace("{{nickName}}", creatorName);
                            }
                            ////检查相同聊天内容跳过
                            //for (var j = 0; j < userMsgs.length; j++) {
                            //    var itemHis = userMsgs[j];
                            //    if (itemHis.innerHTML.indexOf(content) >= 0) {
                            //        storeSendChat.writeLog('发现相同聊天内容 跳过');
                            //        storeSendChat.closeChatPopupV2(storeSendChat.sendSuccessTime > 0 ? 1 : 0, "发现相同聊天内容 跳过");
                            //        return;
                            //    }
                            //}
                            result = await storeSendChat.sendText(content);
                            if (!result) {
                                throw '发送消息失败 ';
                            }
                            break;
                        case "product":
                            var result = await storeSendChat.sendProductId(item.content, isFirst);
                            isFirst = false;
                            if (!result) {
                                throw '发送产品id失败 ' + item.content;
                            }
                            break;
                    }
                } catch (error) {
                    storeSendChat.writeLog("发送出错：", error);
                }

                storeSendChat.writeLog("成功操作数：" + storeSendChat.sendSuccessTime);
            }
            // await rpa.sleep(2000);
            storeSendChat.writeLog(creatorName + ' 结束发私信……');
            return '发送成功';
        } catch (ex) {
            console.error('运行出现错误：' + ex);
            storeSendChat.writeLog('私信错误：' + ex);
            // await rpa.sleep(2000);
            return '运行出现错误：' + ex;
        }
    },
    //获取当前窗口人名
    async getCurrFormName() {
        // var elNameParentDivs = document.querySelectorAll('.flex-col.justify-center');
        let elName = document.querySelector(".flex.flex-col.justify-center .flex.items-center.text-body-m-medium")
        if (elName) {
            return elName.innerText;
        }
        else {
            return null;
        }
    },
    async checkLimit5Msg() {
        //消息超过5检测 p-16 text-center bg-white rounded-8 m-8 text-neutral-text4 text-body-m-regular
        var elMax5LimitDivs = document.querySelectorAll('.bg-white.rounded-8.m-8.text-neutral-text4.text-body-m-regular');
        if (elMax5LimitDivs.length > 0) {
            console.log('消息超过5条限制');
            return false;
        }

        return true;
    },

    /**
     * 发送文本消息
     */
    async sendText(textContent) {
        if (textContent == "") {
            return false;
        }
        //改版前index-module_textarea__Xgm4v 改版后 index-module__textarea--ypMLj
        var txtInput = document.querySelector('.chatd-root textarea');
        if (txtInput) {
            storeSendChat.writeLog('输入文本');
            rpa.inputText(txtInput, textContent);
        }
        let elSend = document.querySelector(this.selectorSend);
        //没找到发送按钮关闭不计数
        if (!elSend) {
            throw '未发现发消息按钮';
        }
        storeSendChat.writeLog('点击发送消息按钮');
        rpa.clickCEF(elSend);
        await rpa.sleep(1000)
        await rpa.sleep(storeSendChat.intervalSecond * 1000);
        return await this.checkSendResult();
    },
    /**
     * 发送图片 返回true表示成功 false可能上传等待超时未必发送成功
     */
    async sendImage(filePath) {
        //发送图片按钮
        var btnSendClass = '.arco-btn-primary';

        //发送图片 如果有文字内容则在图片发送完成后回调中再发文字 改版前arco-icon-file_image 英国 改版后arco-icon arco-icon-file-image index-module__arcoIcon---nDUL 美国
        let subEle = document.querySelectorAll('.arco-icon.arco-icon-file-image.index-module__arcoIcon---nDUL');
        //没找到发送按钮关闭窗口
        if (subEle.length == 0) {
            subEle = document.querySelectorAll('.arco-icon-file-image');
            if (subEle.length == 0) {
                throw '未发现上传图片按钮';
            }
        }
        await rpa.sleep(1000);
        if (subEle.length > 0) {
            //先设置图片准备自动设置上传图片
            // console.log("图片路径：", filePath);
            if (!await rpa.setUploadFilePath([filePath])) {
                throw '设置待上传图片失败';
            }
            storeSendChat.writeLog('点击上传图片按钮');
            var updClassName = ".zoomModal-enter-done";
            rpa.clickCEF(subEle[0])

            await rpa.sleep(500);
            await rpa.waitElement(updClassName);

            let zoomModal = document.querySelectorAll(updClassName);
            if (zoomModal.length > 0) {
                let priBtnEles = zoomModal[0].querySelectorAll(btnSendClass);
                if (priBtnEles.length > 0) {
                    storeSendChat.writeLog('点击上传确定');
                    rpa.clickCEF(priBtnEles[0]);
                    await rpa.sleep(1000)
                    await rpa.sleep(storeSendChat.intervalSecond * 1000);
                    return await this.checkSendResult();
                }
            }
        }

        return false;
    },
    /**
     * 发送商品ID
     */
    async sendProductId(pId, isFirst = true) {
        try {
            var btnSend = await rpa.waitElement('.arco-btn-primary', 10);
            if (!btnSend) {
                throw '未找到发送按钮';
            }

            if (isFirst) {
                storeSendChat.writeLog('点击右侧商品图标');
                var tabBtns = document.querySelectorAll('.arco-tabs-header-title .arco-space-item');
                //storeSendChat.writeLog(tabBtns)
                rpa.clickCEF(tabBtns[0]);
                //等待下拉按钮出现
                await rpa.waitElement('.m4b-select');
                await rpa.sleep(500);
                storeSendChat.writeLog('点击商品筛选下拉');
                rpa.clickCEF(document.querySelectorAll('.m4b-select')[0]);
                await rpa.sleep(500);
                storeSendChat.writeLog('点击下拉的产品id项');
                rpa.clickCEF(document.querySelectorAll('.m4b-select-option')[1]);
            }

            await rpa.sleep(500);
            storeSendChat.writeLog('输入产品id');
            let searchEle = document.getElementById('workbench-container').getElementsByClassName('arco-input-size-default');
            rpa.inputText(searchEle[1], pId);

            await rpa.sleep(500);
            storeSendChat.writeLog('点击搜索按钮');
            rpa.clickCEF(document.getElementById('workbench-container').getElementsByClassName('arco-input-group-suffix')[0]);

            //await rpa.sleep(500);
            //if (!await rpa.waitSleep(10000)) {
            //    throw '查询产品id失败';
            //}
            await rpa.waitElement("#workbench-container .arco-btn-primary-text");
            //await rpa.waitElement('#workbench-container');
            //await rpa.waitElement('.arco-btn-primary-text');
            let productEles = document.getElementById('workbench-container').getElementsByClassName('arco-btn-primary-text');
            if (productEles.length > 0) {
                storeSendChat.writeLog('点击发送产品id按钮');
                rpa.clickCEF(productEles[0]);
                await rpa.sleep(1000);
                await rpa.sleep(storeSendChat.intervalSecond * 1000);
                return await this.checkSendResult();
            } else {
                throw '未发现发送产品id按钮';
            }
        } catch (e) {
            storeSendChat.writeLog("发送产品id出错：", e)
        }
        return false
    },
    //返回true成功
    async checkSendResult() {
        //等待发送
        await rpa.waitNotExist(".chatd-icon.chatd-icon--spinning");
        //发送后检查发送失败次数
        if (document.querySelectorAll(".chatd-message-status-content--failed").length > this.sendBeforeFailTime) {
            storeSendChat.writeLog("发现失败感叹号消息可能未发送成功！！！");
            return false;
        }
        storeSendChat.sendSuccessTime++;
        storeSendChat.writeLog("发送完成");
        return true
    },

    //关闭窗口
    closeTab() {

    },

    //展示调试日志 排查问题用
    writeLog(content) {
        // console.info("私信日志：" + content);
        rpa.runMessage("发送私信：" + content);
    },

};
var orderSendChat = {
    chatMsgItems: [{ "type": 'text', "content": 'hi' }],
    intervalSecond: 1,
    skipChated: false,                //跳过已沟通
    skipReply: false,                 //跳过回复
    buyerId: "x",                     //当前操作的买家id
    sendSuccessTime: 0,               //本次发送次数 

    /**
     * 初始设置 并开始任务 orderSendChat.setChatConfigRun(1, 1, false, true, [{"id": 1, "type": 'text', "content": 'hi'},{"id": 3, "type": 'product', "content": '1730305900123490499'}], "")
     * @param {*} status 1执行中
     * @param {*} second 秒数
     * @param {*} skip true有消息都跳过
     * @param {*} skipReply true有回复跳过
     * @param {*} msgItems json对象
     * @param {*} name 当前操作的达人名
     */
    async setChatConfigRun(params = null) {
        if (!params) {
            return
        }
        params = JSON.parse(params);
        console.info("收到参数：", params);
        this.buyerId = params.buyerId;
        this.intervalSecond = params.intervalSecond;
        this.skipChated = params.skipChated;
        this.skipReply = params.skipReply;
        this.chatMsgItems = params.msgItems;
        this.sendSuccessTime = 0;

        let msg = await this.startSend();
        return JSON.stringify({ sucNum: this.sendSuccessTime, msg });
    },

    //开始发送
    async startSend() {
        try {
            console.log('准备开始发送……')
            // return '调试'
            await rpa.waitElement('.chatd-message');

            //等待发送按钮出现 
            try {
                var btnSend = await rpa.waitElement("#chat-input-send-button", 40);
                if (!btnSend) {
                    throw '未找到发送按钮';
                }
            } catch (e) {
                var noChatTitles = document.querySelectorAll(".pulse-empty-title")
                if (noChatTitles.length > 0) {
                    //页面加载完成但没有发送按钮和文本框 创建私信失败的情况
                }
                //发送按钮不出现则尝试刷新
                location.reload();
            }

            //读取页面消息记录判断已沟通和待回复
            var elMsgItems = document.querySelectorAll(".chatd-message");
            var userMsgs = [];
            for (var i = 0; i < elMsgItems.length; i++) {
                var item = elMsgItems[i];
                if (!item.outerHTML.includes('chatd-systemMessage-content')) {
                    userMsgs.push(item);
                }
            }

            if (userMsgs.length > 0) {
                if (this.skipChated) {
                    return '已沟通过'
                }
                if (this.skipReply) {
                    if (userMsgs[userMsgs.length - 1].className.includes('chatd-message--left')) {
                        return '有消息待回复'                           //最后一条消息在坐标就是待回复
                    }
                }
                // let lastTime = userMsgs[userMsgs.length - 1].querySelector('.chatd-time').innerText
                // console.log('最后一条消息时间：', chatTimeParser.parse(lastTime))
                //包含chatd-message--right是商家消息 包含chatd-message--left是买家消息
                // let sendMsgs = userMsgs.filter(w => w.className.includes('chatd-message--right'))
                // if (sendMsgs.length > 0) {
                //     let lastTime2 = sendMsgs[sendMsgs.length - 1].querySelector('.chatd-time').innerText
                //     console.log('最后一次发送消息时间：', chatTimeParser.parse(lastTime2))
                // }
            }

            var txtInput = await rpa.waitElement('#chat-input-textarea');
            //var txtEleArea = document.getElementById('chat-input-textarea');
            // console.log('发现元素文本框:', txtInput);
            if (txtInput == undefined) {
                txtInput = document.getElementById('chat-input-textarea');
                if (txtInput == undefined) {
                    return '未发现文本框';
                }
            }
            //开始发送
            var result = false;
            //开始发消息 
            for (const item of this.chatMsgItems) {
                try {
                    switch (item.type) {
                        case "image":
                            break;
                        case "text":
                            var content = item.content;
                            ////检查相同聊天内容跳过
                            //for (var j = 0; j < userMsgs.length; j++) {
                            //    var itemHis = userMsgs[j];
                            //    if (itemHis.innerHTML.indexOf(content) >= 0) {
                            //        orderSendChat.writeLog('发现相同聊天内容 跳过');
                            //        orderSendChat.closeChatPopupV2(orderSendChat.sendSuccessTime > 0 ? 1 : 0, "发现相同聊天内容 跳过");
                            //        return;
                            //    }
                            //}
                            result = await this.sendText(content, txtInput);
                            if (!result) {
                                throw '发送消息失败 ';
                            }
                            break;
                        case "product":

                            break;
                    }
                } catch (error) {
                    console.error("发送出错：", error);
                }

                this.writeLog("成功操作数：" + this.sendSuccessTime);
            }
            this.writeLog('结束发私信……');
            await rpa.sleep(2000);
            return '发送成功';
        } catch (ex) {
            console.error('运行错误：' + ex);
            // await rpa.sleep(2000);
            return '运行错误：' + ex;
        }
    },

    /**
     * 发送文本消息
     */
    async sendText(textContent, txtInput) {
        await rpa.sleep(500);
        if (textContent == "") {
            this.writeLog('消息内容为空');
            return false;
        }

        //输入文本
        var txtEle = txtInput.getElementsByTagName('textarea');
        if (txtEle.length == 0) {
            return false;
        }
        rpa.inputText(txtEle[0], textContent);
        await rpa.sleep(1000);
        await rpa.waitNotExist('.theme-arco-btn.theme-arco-btn-primary.theme-arco-btn-size-default.theme-arco-btn-shape-square.theme-arco-btn-disabled')
        //等待翻译完成点击发送
        let subEle = document.querySelector("#chat-input-send-button");
        if (subEle) {
            // //点击发送
            // rpa.clickCEF(subEle);
            this.sendSuccessTime++;
            this.writeLog('发送文字完成');
            await rpa.sleep(2000);
            return true;
        }

        return false;
    },

    //关闭窗口
    closeTab() {

    },

    //展示调试日志 排查问题用
    writeLog(content) {
        // console.info("私信日志：" + content);
        rpa.runMessage("发送私信：" + content);
    },

};

// 时间解析器对象
var chatTimeParser = {
    // 月份映射（中英文）
    monthMap: {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        '1月': 0, '2月': 1, '3月': 2, '4月': 3, '5月': 4, '6月': 5, '7月': 6, '8月': 7, '9月': 8, '10月': 9, '11月': 10, '12月': 11
    },
    // 相对时间映射（中英文）
    relativeMap: {
        '昨天': -1, '今天': 0, 'Yesterday': -1, 'Today': 0
    },
    // 星期映射（中英文）
    weekMap: {
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
        '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6
    },
    // 时段映射（中英文）
    periodMap: {
        AM: 'AM', PM: 'PM', '上午': 'AM', '下午': 'PM'
    },

    /**
     * 12小时制转24小时制（兼容中英文时段）
     * @param {number} hour - 12小时制小时数
     * @param {string} period - 时段（上午/下午/AM/PM）
     * @returns {number} 24小时制小时数
     */
    convert12To24(hour, period) {
        const enPeriod = this.periodMap[period];
        if (enPeriod === 'PM' && hour !== 12) return hour + 12;
        if (enPeriod === 'AM' && hour === 12) return 0;
        return hour;
    },

    /**
     * 计算最近一周内的“星期X”日期
     * @param {number} targetWeekDay - 目标星期（0-6）
     * @param {Date} baseDate - 基准日期
     * @returns {Date} 对应日期
     */
    getRecentWeekDayDate(targetWeekDay, baseDate = new Date()) {
        const baseWeekDay = baseDate.getDay();
        let offset = targetWeekDay - baseWeekDay;
        // 优化：若目标星期已过，取上周的（比如今天周三，取周一则是上周周一，取周四则是本周四）
        if (offset > 0) offset -= 7;
        const targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() + offset);
        return targetDate;
    },

    parse(timeStr) {
        try {
            if (typeof timeStr !== 'string') {
                console.error('输入必须是字符串格式的时间');
                return null;
            }
            const now = new Date();
            const trimmed = timeStr.trim();

            // 中文星期格式（兼容任意空格，如“星期一, 8:25 下午” “星期一,8:25下午”）
            // const cnWeekReg = /^(星期[一二三四五六日]),\s*(\d+:\d+)\s*([上午|下午]+)$/;
            const cnWeekReg = /^(星期[一二三四五六日])\s*,\s*(\d{1,2}:\d{1,2})\s*(上午|下午)$/;
            // const cnWeekReg = /(星期[一二三四五六日]),\s(\d{1,2}:\d{1,2})\s(上午|下午)/;
            const cnWeekMatch = trimmed.match(cnWeekReg);
            if (cnWeekMatch) {
                const [_, weekDay, time, period] = cnWeekMatch;
                const targetWeekDay = this.weekMap[weekDay];
                if (targetWeekDay !== undefined) {
                    const [hourStr, minute] = time.split(':');
                    const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                    const targetDate = this.getRecentWeekDayDate(targetWeekDay, now);
                    targetDate.setHours(hour24, parseInt(minute, 10), 0, 0);
                    return targetDate;
                }
            }

            // 中文日期格式（兼容任意空格，如“11月19日 下午3:47”“11月19日下午3:47”）
            const cnDateReg = /^(\d+月\d+日)\s*([上下午]+)\s*(\d+:\d+)$/;
            const cnDateMatch = trimmed.match(cnDateReg);
            if (cnDateMatch) {
                const [_, datePart, period, time] = cnDateMatch;
                const [monthPart, day] = datePart.split('月');
                const month = this.monthMap[monthPart + '月'];
                const [hourStr, minute] = time.split(':');
                const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                return new Date(
                    now.getFullYear(),
                    month,
                    parseInt(day.replace('日', ''), 10),
                    hour24,
                    parseInt(minute, 10),
                    0, 0
                );
            }

            // 英文星期格式（如“Thursday, 11:40 AM”“Thursday,11:40AM”）
            const enWeekReg = /^([A-Za-z]+)\s*,\s*\d{1,2}:\d{2}\s*[AP]M$/;
            const enWeekMatch = trimmed.match(enWeekReg);
            if (enWeekMatch) {
                const [_, weekDay] = enWeekMatch;
                const targetWeekDay = this.weekMap[weekDay];
                if (targetWeekDay !== undefined) {
                    // 提取时间和时段（兼容无空格）
                    const timePeriod = trimmed.split(/\s*,\s*/)[1];
                    const timeMatch = timePeriod.match(/(\d+:\d+)\s*([AP]M)/);
                    if (timeMatch) {
                        const [_, time, period] = timeMatch;
                        const [hourStr, minute] = time.split(':');
                        const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                        const targetDate = this.getRecentWeekDayDate(targetWeekDay, now);
                        targetDate.setHours(hour24, parseInt(minute, 10), 0, 0);
                        return targetDate;
                    }
                }
            }

            // 英文绝对时间（如“Nov 19 8:37 PM”）
            const enAbsoluteReg = /^[A-Za-z]{3}\s+\d{1,2}\s+\d{1,2}:\d{2}\s+[AP]M$/;
            if (enAbsoluteReg.test(trimmed)) {
                const [monthAbbr, day, time, period] = trimmed.split(/\s+/);
                const [hourStr, minute] = time.split(':');
                const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                return new Date(now.getFullYear(), this.monthMap[monthAbbr], parseInt(day, 10), hour24, parseInt(minute, 10), 0, 0);
            }

            // 相对时间（兼容任意空格，如“昨天 3:00 下午”“昨天3:00下午”“Yesterday 5:24 PM”）
            const relativeReg = /^(\S+)\s*(\d+:\d+)\s*([上下午APM]+)$/i;
            const relativeMatch = trimmed.match(relativeReg);
            if (relativeMatch) {
                const [_, relativeKey, time, period] = relativeMatch;
                const offset = this.relativeMap[relativeKey];
                if (offset !== undefined) {
                    const [hourStr, minute] = time.split(':');
                    const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                    const target = new Date(now);
                    target.setDate(target.getDate() + offset);
                    target.setHours(hour24, parseInt(minute, 10), 0, 0);
                    return target;
                }
            }

            // 当天时间（兼容任意空格，如“10:13 AM”“3:47下午”）
            const todayTimeReg = /^(\d+:\d+)\s*([上下午APM]+)$/i;
            const todayTimeMatch = trimmed.match(todayTimeReg);
            if (todayTimeMatch) {
                const [_, time, period] = todayTimeMatch;
                const [hourStr, minute] = time.split(':');
                const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                const target = new Date(now);
                target.setHours(hour24, parseInt(minute, 10), 0, 0);
                return target;
            }

            // 新增：匹配“下午 3:39”“上午 8:02”这类 时段+时间 的格式（优先级最高）
            const periodTimeReg = /^(上午|下午)\s*(\d{1,2}:\d{1,2})$/;
            const periodTimeMatch = trimmed.match(periodTimeReg);
            if (periodTimeMatch) {
                const [_, period, time] = periodTimeMatch;
                const [hourStr, minute] = time.split(':');
                const hour24 = this.convert12To24(parseInt(hourStr, 10), period);
                const target = new Date(now);
                target.setHours(hour24, parseInt(minute, 10), 0, 0);
                return target;
            }

            console.error(`时间解析失败：${timeStr}`);
        } catch (error) {
            console.error(`时间解析出错：`, error);
        }
        return null;
    },

    addDays(currTime, days) {
        // 获取当前日期对象的时间戳（毫秒数）
        const currentTimestamp = currTime.getTime();
        // 计算指定天数对应的毫秒数
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
        const daysInMilliseconds = days * oneDayInMilliseconds;
        // 计算新的时间戳
        const newTimestamp = currentTimestamp + daysInMilliseconds;
        // 使用新的时间戳创建一个新的 Date 对象
        return new Date(newTimestamp);
    }
};
// // 测试绝对时间解析 
// console.log("测试1（Yesterday 5:24 PM）：", chatTimeParser.parse("Yesterday 5:24 PM").ToString());
// console.log("测试2（10:13 AM）：", chatTimeParser.parse("10:13 AM").ToString());
// console.log("测试3（今天 3:00 PM）：", chatTimeParser.parse("今天 3:00 PM").ToString());
// console.log("测试4（Nov 19 8:37 PM）：", chatTimeParser.parse("Nov 19 8:37 PM").ToString());
// console.log("测试5（11月19日 下午3:47）：", chatTimeParser.parse("11月19日 下午3:47").ToString());
// console.log("测试6（星期一, 8:25 下午）：", chatTimeParser.parse("星期一, 8:25 下午").ToString());


console.log('sendChat加载完成');