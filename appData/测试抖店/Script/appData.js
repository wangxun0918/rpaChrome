var appData = {
  isDebug: false,

  /**
   * 语言 1中文 2英文
   */
  language: 1,

  cookie: "",

  siteId: 0,
  regionCode: "",

  shopId: "",
  shopName: "",

  //登录用户信息 这里只用手机号
  userInfo: {
    username: "",
  },

  //邀约模板配置
  inviSettingUS: null,
  //私信模板配置
  chatInviSettingV2: null,
  //订单买家私信模板配置
  chatOrderBuyerSetting: null, 
  /**
   * 清理邀约计划
   */
  clearInviteSetting: null,
  /**
   * 达人样品审核
   */
  sampleActionSetting: null,

  //当前执行的任务
  ExecuteTaskItem: null,

  //邀约或私信执行状态 0执行完，1正在执行  只用于关闭程序时判断是否自动停止
  executing: 0,

  //达人来源类型 1查找达人 2达人库
  CreatorSourceType: 1,

  //邀约每次执行剩余量
  EveryTimeInviteLeft: 0,

  //定向计划本次任务已同步的商品
  InviteHistoryProductId: [],

  /**
   * 定向计划历史记录
   */
  inviteHistoryItems: [],
  /**
   * 私信历史记录
   */
  chatHistoryItems: [],

  /**
   * 已邀约达人id列表
   */
  InvitedCreatorIds: [],

  //已私信的达人id列表
  ChatedCreatorIds: [],

  /**
   * 查找达人已读取过名称列表
   */
  ReadFindCreatorNameList: [],

  //极速私信组
  ApiChatCreatorIdGroup: [],

  /**
   * 当前邀约的达人分组
   */
  CurrentUSTalentList: [],

  //tk查找达人域名
  TKFindCreatorUrlInfo: null,
  /**
   * 获取联盟中心页接口主域名 末尾包含/ 加地区这里有3处 客户端有4处多GetRegionCodeBySiteId
   * @returns 
   */
  GetDomain() {
    return appData.TKFindCreatorUrlInfo.domain + "/";
  },
  //获取地区名
  GetReginName(regionCode) {
    switch (regionCode) {
      case "MY":
        return this.GetTranText("马来西亚");
      case "TH":
        return this.GetTranText("泰国");
      case "PH":
        return this.GetTranText("菲律宾");
      case "VN":
        return this.GetTranText("越南");
      case "SG":
        return this.GetTranText("新加坡");
      case "ID":
        return this.GetTranText("印尼");
      case "GB":
        return this.GetTranText("英国");
      case "US":
        return this.GetTranText("美国");
      case "ES":
        return this.GetTranText("西班牙");
      case "MX":
        return this.GetTranText("墨西哥");
      case "DE":
        return this.GetTranText("德国");
      default:
        return regionCode;
    }
  },
  //地区站点名称
  GetSiteName(siteId) {
    switch (siteId) {
      case 1:
        return this.GetTranText("英国");
      case 2:
        return this.GetTranText("印尼");
      case 3:
        return this.GetTranText("马来西亚");
      case 4:
        return this.GetTranText("泰国");
      case 5:
        return this.GetTranText("越南");
      case 6:
        return this.GetTranText("菲律宾");
      case 7:
        return this.GetTranText("新加坡");
      case 8:
        return this.GetTranText("中国跨境");
      case 9:
        return this.GetTranText("美国");
      case 10:
        return this.GetTranText("西班牙");
      case 11:
        return this.GetTranText("墨西哥");
      case 12:
        return this.GetTranText("德国");
      default:
        return "";
    }
  },
  GetSiteId(regionCode) {
    switch (regionCode) {
      case "MY":
        return 3;
      case "TH":
        return 4;
      case "PH":
        return 6;
      case "VN":
        return 5;
      case "SG":
        return 7;
      case "ID":
        return 2;
      case "GB":
        return 1;
      case "US":
        return 9;
      case "ES":
        return 10;
      case "MX":
        return 11;
      case "DE":
        return 12;
      default:
        return 0;
    }
  },
  //获取秒级时间戳
  getTimestampSecond() {
    return Math.floor(Date.now() / 1000) + "";
  },
  //获取毫秒级时间戳
  getTimestampMillisecond(dataTime = null) {
    if (dataTime) {
      return dataTime.getTime();
    } else {
      return Date.now().getTime();
    }
  },
  //获取格式化时间 现在时间new Date()
  getFormatDate(date = null) {
    if (!date) {
      date = new Date();
    }

    function padZero(num) {
      return num < 10 ? "0" + num : num;
    }

    var year = date.getFullYear();
    var month = padZero(date.getMonth() + 1); // getMonth() 返回的月份是从 0 开始的
    var day = padZero(date.getDate());
    var hours = padZero(date.getHours());
    var minutes = padZero(date.getMinutes());
    var seconds = padZero(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },
  //获取md5大写32位
  getMD5x32(str) {
    return md5.encrypt(str).toUpperCase();
  },
  //导入js脚本 此方法导入的脚本都在html页面上 插件暂时无法访问到
  importJavaScript(src) {
    // 通过chrome.runtime.getURL方法获取jQuery的路径
    var path = chrome.runtime.getURL(src);
    // 动态创建script标签并添加到页面上
    var script = document.createElement("script");
    script.src = path;
    document.head.appendChild(script);

    console.log(script.textContent);
    // 等待jQuery加载完成
    script.onload = function () {
      console.log(src + " onload加载完成");
    };

    // script.setAttribute("type", "module");
    // script.setAttribute("src", chrome.extension.getURL("CryptoJS.js")); // 引用文件的路径

    //这种会报错
    // var script = document.createElement("script");
    // script.setAttribute("type", "text/javascript");
    // script.setAttribute("src", src); // 引用文件的路径
    // document.getElementsByTagName("head")[0].appendChild(script); // 引用文件
  },
  //字符串转换未数值去掉货币字符 百分号
  GetNum(str) {
    // 使用正则表达式去除货币符号和千位分隔符
    // let str = "₱17,969.89";
    // 定义常见国家货币符号的正则表达式
    const currencySymbols = /[₱$€£¥₩₹₺₼؋៛\u20A0-\u20CF]/g;
    // 使用正则表达式去除货币符号和千位分隔符
    let numStr = str.replace(currencySymbols, "").replace(/,/g, "");

    //处理k
    let multiplier = 1;
    let lowerStr = str.toLowerCase();
    if (lowerStr.endsWith("k")) {
      multiplier = 1000;
    } else if (lowerStr.endsWith("m")) {
      multiplier = 1000000;
    } else if (lowerStr.endsWith("b")) {
      multiplier = 1000000000;
    }

    // 转换为带小数的数字
    let num = parseFloat(numStr) * multiplier;
    // console.log("处理数值转换：", str, num);
    return num;
  },
  //小数保留指定位数 四舍五入必须传入小数 默认保留2位小数
  roundToDecimal(floatNum, ws = 2) {
    return parseFloat(floatNum.toFixed(ws));
  },
  //获取日志和运行记录type
  GetTaskType(currTask) {
    //0-邀约达人，1-私信达人，2-私聊买家，3-清理无效计划，4-tap邀约 5-补充计划达人 6-极速私信 7-发信记录
    var taskType = -1;
    switch (currTask.taskType) {
      case 1:
        taskType = 0; //邀约任务
        break;
      case 2:
        taskType = 1; //私信任务
        if (appData.chatInviSettingV2.i_msg_type != 0) {
          taskType = 6;
        }
        break;
      case 3:
        break;
      case 4:
        break;
      case 5:
        taskType = 2; //私信买家
        break;
      case 6:
        break;
      case 7:
        taskType = 3; //清理无效计划
        break;
      case 14:
        taskType = 8; //样品审核
        break;
    }
    return taskType;
  },
  //中英文转换
  GetTranText(content) {
    if (typeof dami_lang_en == "undefined") {
      return content;
    }
    //英文
    if (this.language == 2) {
      //检查是否包含中文
      const pattern = /[\u4e00-\u9fa5]/;
      if (!pattern.test(content)) {
        return content;
      }
      //完整替换
      if (dami_lang_en[content]) {
        return dami_lang_en[content];
      }
      //模糊匹配替换
      var langKeys = Object.keys(dami_lang_en);
      for (const key of langKeys) {
        if (content.Contains(key)) {
          content = content.Replace(key, dami_lang_en[key]);
        }
      }
    }
    //中文
    return content;
  },

  //获取唯一id字符串
  getUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
  },
  /**
   * 请求过程是否发现滑块关键标识
   */
  findTKSliderHeader: false,
  /**
   * tk接口滑块检测 返回true则出现滑块或者code=10000
   * @param {*} result 接口响应
   * @param {*} msg 提示信息
   * @param {*} showSlider 是否弹窗滑块默认true
   * @param {*} waitSecond 等待弹窗滑块的秒数 每个步骤的等待时间所以不是总时间 若showSlider=false则为等待时间
   * @param {*} pageId 在哪个页面id检查滑块出现
   * @returns 
   */
  async checkShowSlider(result, msg = "遇到滑块验证请等待程序自动验证 若无法自动通过请人工处理", showSlider = true, waitSecond = 20, pageId = -1) {
    try {
      if (result && result.code == 10000) {
        if (!this.findTKSliderHeader) {
          await rpa.runMessage(`遇到ip限制或网络波动 已跳过 响应：${JSON.stringify(result)}`);
          await rpa.sleep(1000);
          return true
        }
        this.findTKSliderHeader = false
        await rpa.runMessage(`${msg} 响应：${JSON.stringify(result)}`);

        if (showSlider) {
          if (pageId == -1) {
            pageId = bootScript.pageFindCreator;
          }
          //先刷查找达人接口直到出现滑块或者超时
          if (msg != "查找达人遇到滑块验证 请等待识别验证（若多次无法通过验证请人工操作）……") {
            for (let i = 0; i < waitSecond * 10 && appData.executing == 1; i++) {
              await rpa.sleep(100);
              let findcreatorResp = await tikTokApi.findCreatorsAsync({ "query": "asdf", "pagination": { "size": 12, "page": 0 }, "query_type": 1, "filter_params": { "follower_filter": { "left_bound": 9000000, "right_bound": -1 } }, "algorithm": 1 });
              if (findcreatorResp.code == 10000 && this.findTKSliderHeader) {
                await rpa.runMessage(`查找达人页面已检测到滑块`);
                break;
              }
            }
          }
          //开始连续点击弹出滑块
          let findSlider = false
          for (let i = 0; i < waitSecond && appData.executing == 1; i++) {
            let checkR = await rpa.callPageJS(pageId, "sliderHandle.existSlider", 3, 'null');                   //检测是否出现滑块            
            if (checkR) {
              await rpa.runMessage(`界面已弹出滑块`, checkR);
              findSlider = true                             //记录出现过滑块
              break;
            } else {
              await rpa.sleep(2000);
              await rpa.callPageRpa(bootScript.pageFindCreator, "click", "达人广场搜索按钮", false);           //未出现过滑块尝试点出来 
              await rpa.sleep(2000);
            }
          }
          //等待滑块消失验证通过
          if (findSlider) {
            do {
              await rpa.sleep(1000);
              let checkR = await rpa.callPageJS(pageId, "sliderHandle.existSlider", 3, 'null');                   //检测是否出现滑块
              if (!checkR) {
                await rpa.runMessage(`滑块验证已通过`);
                break;
              }
            } while (appData.executing == 1);
          }
          await rpa.sleep(2000);
        } else {
          await rpa.sleep(waitSecond * 1000);
        }
        return true;
      }
    } catch (error) {
      await rpa.runMessage(`检测滑块出错：${error}`);
    }
    return false;
  },
};

const LogHelper = {
  //回传日志
  callback: null,

  Info(msg) {
    if (this.callback) {
      this.callback(msg);
    } else {
      console.info("文件日志：", msg);
    }
  },
};

const talentDal = {
  //回传日志
  callback: null,
  //运行日志
  logItems: [],
  //保存日志
  async AddExecuteLog(log) {
    await rpa.sleep(100);

    log.createTimeStamp = DateTime.NowStamp().toString();
    log.logType = appData.GetTranText(log.logType);
    log.content = appData.GetTranText(log.content);

    if (this.callback) {
      this.callback(log);
    } else {
      console.info("运行日志：", log);
    }
    // this.logItems.push(log);
  },
  async AddExecuteLogV2(content, type = "信息") {
    if (!appData.ExecuteTaskItem) {
      return;
    }

    var log = {
      taskId: appData.ExecuteTaskItem.id,
      logType: type,
      content: content,
    };

    await rpa.sleep(100);
    log.createTimeStamp = DateTime.NowStamp().toString();
    log.logType = appData.GetTranText(log.logType);
    log.content = appData.GetTranText(log.content);

    if (this.callback) {
      this.callback(log);
    } else {
      console.info("运行日志：", log);
    }
    // this.logItems.push(log);
  },
};

// if (rpa.debug) {
//   appData.isDebug = rpa.debug;
// }
console.info("appData加载完成");
