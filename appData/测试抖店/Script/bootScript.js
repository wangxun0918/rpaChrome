//脚本入口 运行环境已经注册rpa对象 点击停止会执行 window.bootScript.stop() 
var globalVar = instructScript.globalVar;
var bootScript = {

  shopId: "",
  regionCode: "", //地区码

  pageFindCreator: -1,    //查找达人页面id
  pageCreateInvite: -1,   //邀约页面id
  pageAutoChat: -1,       //私信页面id
  pageOrderInfo: -1,      //订单页面信息

  shopInfoConfig: null,
  findCreatorConfig: null,
  inviteCheckConfig: null,
  inviteCreatorConfig: null,
  orderSearchConfig: null,    //订单搜索接口配置

  /**
   * 本次运行最新url参数对象 从查找达人列表接口取.params 处理好字段用rpa.urlParamStringify转为字符串
   */
  lastUrlParam: null,

  onShopInfo: async function (json) {
    var reqInfo = JSON.parse(json);
    this.shopInfoConfig = reqInfo;
    await rpa.writeRunLog("获取到店铺信息：", reqInfo);
    await rpa.wake("waitShopInfo");
  },
  firstCreator: null, //查找达人第一个达人用于前往邀约页面不用选达人
  onFindSearch: async function (json) {
    var reqInfo = JSON.parse(json);
    if (!this.lastUrlParam) {
      this.lastUrlParam = rpa.parseUrl(reqInfo.reqUrl).params;
      delete this.lastUrlParam["X-Bogus"];
      delete this.lastUrlParam.msToken;
      delete this.lastUrlParam._signature;
    }
    if (reqInfo.respBody) {
      let respObj = JSON.parse(reqInfo.respBody);
      if (respObj && respObj.creator_profile_list && respObj.creator_profile_list.length > 0) {
        this.firstCreator = respObj.creator_profile_list[0];
      }
    }
    delete reqInfo.respBody;
    delete reqInfo.respHeader;
    delete reqInfo.reqHeader.Cookie;
    this.findCreatorConfig = reqInfo;
    console.log("获取到查找达人配置：", this.findCreatorConfig);
    await rpa.wake("waitFindCreator");
  },
  onCheckInvite: async function (json) {
    var reqInfo = JSON.parse(json);
    delete reqInfo.respBody;
    delete reqInfo.respHeader;
    delete reqInfo.reqHeader.Cookie;
    this.inviteCheckConfig = reqInfo;
    console.log("获取到检测邀约配置：", this.inviteCheckConfig);
    // await rpa.wake("waitCheckInvite");   //只要获取导邀约配置这里肯定能
  },
  onInvite: async function (json) {
    var reqInfo = JSON.parse(json);
    delete reqInfo.respBody;
    delete reqInfo.respHeader;
    delete reqInfo.reqHeader.Cookie;
    this.inviteCreatorConfig = reqInfo;
    console.log("获取到邀约配置：", this.inviteCreatorConfig);
    await rpa.wake("waitCreateInvite");
  },

  //不用此方法
  onOrderSearch: async function (json) {
    var reqInfo = JSON.parse(json);
    if (!this.lastUrlParam) {
      this.lastUrlParam = rpa.parseUrl(reqInfo.reqUrl).params;
      delete this.lastUrlParam["X-Bogus"];
      delete this.lastUrlParam.msToken;
      delete this.lastUrlParam._signature;
      appData.shopId = this.lastUrlParam.oec_seller_id
    }
    delete reqInfo.respBody;
    delete reqInfo.respHeader;
    delete reqInfo.reqHeader.Cookie;
    this.orderSearchConfig = reqInfo;
    console.log("获取到订单配置：", this.orderSearchConfig, this.lastUrlParam);
    await rpa.wake("waitOrderSearch");
  },
  orderBuyerItems: [],                              //获取到的订单卖家数据 [{orderId, urlPc, pigeonUid, urlParams}]
  onGetContactBuyer: async function (json) {
    var reqInfo = JSON.parse(json);
    if (!this.lastUrlParam) {
      this.lastUrlParam = rpa.parseUrl(reqInfo.reqUrl).params;
      delete this.lastUrlParam["X-Bogus"];
      delete this.lastUrlParam.msToken;
      delete this.lastUrlParam._signature;
      appData.shopId = this.lastUrlParam.oec_seller_id
    }
    if (reqInfo.respBody) {
      let respObj = JSON.parse(reqInfo.respBody);
      if (respObj.data && respObj.data.orderIdToContactLinkInfo) {
        let addCount = 0
        for (const key of Object.keys(respObj.data.orderIdToContactLinkInfo)) {
          if (respObj.data.orderIdToContactLinkInfo[key].urlPc && !this.orderBuyerItems.Any(w => w.pigeonUid == respObj.data.orderIdToContactLinkInfo[key].pigeonUid)) {
            var urlParams = rpa.parseUrl(this.pageOrderInfo.domain + respObj.data.orderIdToContactLinkInfo[key].urlPc).params
            if (urlParams) {
              appData.regionCode = urlParams.shop_region
              this.orderBuyerItems.push({
                orderId: key,
                pigeonUid: respObj.data.orderIdToContactLinkInfo[key].pigeonUid,
                urlPc: respObj.data.orderIdToContactLinkInfo[key].urlPc,
                urlParams: urlParams
              })
              addCount++                        //读取买家数据
            }
          }
        }
        console.log(`本页获取到${addCount}个可发私信买家数据：`, respObj.data.orderIdToContactLinkInfo, this.orderBuyerItems);
      }
    }
    delete reqInfo.respBody;
    delete reqInfo.respHeader;
    delete reqInfo.reqHeader.Cookie;
    this.orderSearchConfig = reqInfo;
    console.log("获取到订单配置：", this.orderSearchConfig, this.lastUrlParam);
    await rpa.sleep(1000);
    await rpa.wake("waitGetContactBuyer");
  },

  //获取查找达人页面信息
  async getFindCreatorInfo() {

    //#region 获取查找达人页面

    await rpa.instructMessage("开始获取店铺信息");
    try {
      this.pageFindCreator = await rpa.getPageId("/connection/creator", 2);
    } catch (error) {
      throw "请打开tk店铺并切到 查找达人（Find creators） 页面再启动应用";
    }
    await rpa.activePage(this.pageFindCreator);
    //获取查找达人页面
    var pageFindCreatorInfo = await rpa.getPage();
    if (pageFindCreatorInfo) {
      appData.TKFindCreatorUrlInfo = rpa.parseUrl(pageFindCreatorInfo.url);
      console.log("获取到查找达人url：", appData.TKFindCreatorUrlInfo);
      if (!appData.TKFindCreatorUrlInfo.params.shop_region) {
        throw "获取地区码失败无法正常执行任务";
      }
    }
    await bootScript.injectionJs(`sliderHandle.js`, pageFindCreatorInfo.id);
    // await rpa.callPageJS(pageFindCreatorInfo.id, "sliderHandle.checkSlider", 20, 0);

    //#endregion

    //#region 获取店铺信息

    //获取店铺信息 改为发请求取信息 可能主要取店铺名
    // var keywordShopInfo = 'api/v1/affiliate/account/info';
    // await rpa.regReqMon(this.pageFindCreator, keywordShopInfo, `window.bootScript.onShopInfo`, null, null, false);
    // setTimeout(async () => {
    //     await rpa.callPageRpa(this.pageFindCreator, "refPageId", this.pageFindCreator);
    // }, 200);
    // await rpa.wait(0, "waitShopInfo");
    // await rpa.cancelReqMon(this.pageFindCreator, keywordShopInfo);
    // var respShopInfo = JSON.parse(this.shopInfoConfig.respBody);
    var respShopInfo = await tikTokApi.getAccountInfo(appData.TKFindCreatorUrlInfo.params.shop_region);
    if (respShopInfo != null && respShopInfo.data) {
      // appData.siteId = 8;                                //shop_code是CN开头一般都是跨境店
      appData.regionCode = respShopInfo.data.shop.region;
      appData.shopId = respShopInfo.data.shop.shop_id;
      appData.shopName = respShopInfo.data.shop.shop_name;
    } else {
      console.error("获取店铺信息失败！！！");
      return;
    }

    //#endregion

  },

  //#region 邀约

  async createInviteTask() {
    const taskType = "邀约"
    //获取或创建配置
    var defConfig = {
      id: appData.getUUID(),
      name: "邀约_" + DateTime.Now.ToString("yyyyMMdd"),
      taskType,
      source: 'findCreator',         //达人来源
      assignExcelNamePath: null,     //指定达人的文件路径
      save: true,
      shopId: appData.shopId,
      shopName: appData.shopName,
      regionName: appData.GetReginName(appData.regionCode),
      regionCode: appData.regionCode,
      groupSize: 50,
      groupNum: 10,
      execSpeed: 1,
      useOldParam: false,
      useSyncInvitePlan: false,      //邀约前同步历史合作
      useLocalCheck: true,           //使用本地记录校验 可减少滑块出现
      useClearInvitePlan: false,     //清理本地历史合作 解决校验不准问题

      findCreatorConfig: null,
      inviteCheckConfig: null,
      inviteCreatorConfig: null,
    };
    var appInfo = await rpa.getAppInfo();
    console.log('应用信息：', appInfo);
    if (appInfo.RunParameter) {
      var runParam = JSON.parse(appInfo.RunParameter);
      runParam.runConfigs = runParam.runConfigs.filter((w) => w.shopId == appData.shopId && w.taskType == taskType); //当前店铺的所有历史模板
      runParam.currConfig = defConfig; //弹窗展示默认配置
      globalVar.AppRunParameters = runParam;
    } else {
      //第一次使用初始化数据
      globalVar.AppRunParameters = {
        runConfigs: [],
        currConfig: defConfig,
      };
    }
    await rpa.instructMessage("等待配置任务参数");
    // console.log("弹窗输入数据：", globalVar.AppRunParameters);
    globalVar.AppRunParameters = await bootScript.showDialogForm(`createTkInvite.html`, JSON.stringify(globalVar.AppRunParameters), 1100, 700, -1, -1, true);
    if (!globalVar.AppRunParameters) {
      return;
    }
    // console.log("弹窗返回数据：", globalVar.AppRunParameters);

    await rpa.instructMessage("开始配置查找达人条件");
    var keyword = `api/v1/oec/affiliate/creator/marketplace/find`;
    await rpa.regReqMon(this.pageFindCreator, keyword, `window.bootScript.onFindSearch`, null, null, false);
    await rpa.activePage(this.pageFindCreator)
    if (!globalVar.AppRunParameters.currConfig.useOldParam) {
      //取达人配置
      rpa.runMessage("请在查找达人配置好筛选条件 点击关键字旁搜索按钮 进入下一步");
      globalVar.AppRunParameters = await bootScript.showDialogForm(`createTkInvite.html?step=2`, JSON.stringify(globalVar.AppRunParameters), 800, 175, -1, 0, true);
      if (!globalVar.AppRunParameters) {
        rpa.runMessage("未配置完成任务 结束运行");
        return;
      }
      //点击下一步表示确定选择好条件 执行一次点击搜索按钮
      setTimeout(async () => {
        await rpa.callPageRpa(this.pageFindCreator, "click", "达人广场搜索按钮", true, false, 0);
      }, 1000);
      await rpa.instructMessage("等待配置查找达人条件 点击搜索按钮");
      await rpa.wait(0, "waitFindCreator");
      //打开邀约配置页 到此处查找达人配置已获取完成
      await this.openInvitePage();
      await rpa.activePage(this.pageCreateInvite, true);
      //监控达人和商品检测请求 完成取消 模拟商品和达人检测不冲突防止加不了商品
      var keyword2 = `api/v1/oec/affiliate/seller/invitation_group/conflict_check`;
      await rpa.regReqMon(this.pageCreateInvite, keyword2, `window.bootScript.onCheckInvite`, null, null, false, { code: 0, data: {}, message: "success" });
      //监控邀约请求 截取邀约配置 并拦击发送请求 模拟发送错误请求并提示消息
      var keyword3 = `api/v1/oec/affiliate/seller/invitation_group/create`;
      await rpa.regReqMon(this.pageCreateInvite, keyword3, `window.bootScript.onInvite`, null, null, false, { code: 1, message: "获取邀约配置成功 本次邀约请求已截取未发送 请点击任务页面立即执行" });
      rpa.runMessage("请在邀约页面选1个达人其它条件配置好 点击发送（本次发送会拦截将记录配置后续为您自动寻找达人发送）");
      globalVar.AppRunParameters = await bootScript.showDialogForm(`createTkInvite.html?step=3`, JSON.stringify(globalVar.AppRunParameters), 800, 175, -1, 0, true);
      if (!globalVar.AppRunParameters) {
        rpa.runMessage("未配置完成任务 结束运行");
        return;
      }
      //点击下一步表示确定选择好邀约条件 执行一次点击发送按钮
      setTimeout(async () => {
        await rpa.callPageRpa(this.pageCreateInvite, "click", "邀约达人发送按钮", true, false, 0);
      }, 1000);
      await rpa.instructMessage("等待配置邀约条件 点击发送按钮");
      await rpa.wait(0, "waitCreateInvite");
      await rpa.cancelReqMon(this.pageCreateInvite, keyword2);
      await rpa.cancelReqMon(this.pageCreateInvite, keyword3);
      // //关闭网页 _pageCreateInvite
      // await rpa.closePage(this..pageCreateInvite);
      await rpa.activePage(this.pageFindCreator);

      //处理最新配置
      globalVar.AppRunParameters.currConfig.findCreatorConfig = this.findCreatorConfig;
      globalVar.AppRunParameters.currConfig.inviteCheckConfig = this.inviteCheckConfig;
      globalVar.AppRunParameters.currConfig.inviteCreatorConfig = this.inviteCreatorConfig;
    }

    //更新或者新增模板
    if (globalVar.AppRunParameters.currConfig.save && globalVar.AppRunParameters.currConfig.name) {
      var old = globalVar.AppRunParameters.runConfigs.filter((w) => w.id == globalVar.AppRunParameters.currConfig.id).FirstOrDefault(); //按模板名匹配存在则更新不存在则增加
      if (old) {
        globalVar.AppRunParameters.runConfigs.Remove(old);
      }
      globalVar.AppRunParameters.runConfigs.push(globalVar.AppRunParameters.currConfig);
      appInfo.RunParameter = JSON.stringify(globalVar.AppRunParameters); //保存到应用RunParameter必须是字符串
      await rpa.saveAppParameter(appInfo); //保存数据
      console.log("保存配置：", JSON.parse(appInfo.RunParameter));
    }

    //检查是否需要获取最新url参数
    if (!this.lastUrlParam) {
      //点击下一步表示确定选择好条件 执行一次点击搜索按钮
      do {
        await rpa.instructMessage("等待点击 查找达人搜索按钮");
        await rpa.callPageRpa(this.pageFindCreator, "click", "达人广场搜索按钮", false, false, 0);
        await rpa.wait(5, "waitFindCreator"); //等待5秒再继续执行
      } while (!this.lastUrlParam);
    }

    await rpa.cancelReqMon(this.pageFindCreator, keyword);
    //如果使用旧配置 则在此处获取邀约页面
    await this.openInvitePage();

    //检查参数完整 能否开始执行
    appData.inviSettingUS = globalVar.AppRunParameters.currConfig;
    if (!appData.inviSettingUS.findCreatorConfig || !appData.inviSettingUS.inviteCheckConfig || !appData.inviSettingUS.inviteCreatorConfig) {
      await rpa.instructMessage("检测到配置参数不完整 请重新配置任务参数！！!");
      this.stop();
      return;
    }

    await rpa.sleep(500);
    //解析请求数据 查找达人请求 url参数都一样使用最新获取的
    var reqInfo = appData.inviSettingUS.findCreatorConfig;
    reqInfo.reqBody = JSON.parse(reqInfo.reqBody);
    reqInfo.urlInfo = rpa.parseUrl(reqInfo.reqUrl);
    reqInfo.urlInfo.params = this.lastUrlParam;
    this.findCreatorConfig = reqInfo;
    //检查达人请求
    reqInfo = appData.inviSettingUS.inviteCheckConfig;
    reqInfo.reqBody = JSON.parse(reqInfo.reqBody); //产品id reqBody.invitation_group.product_list
    reqInfo.urlInfo = rpa.parseUrl(reqInfo.reqUrl);
    reqInfo.urlInfo.params = this.lastUrlParam;
    this.inviteCheckConfig = reqInfo;
    //邀约请求
    reqInfo = appData.inviSettingUS.inviteCreatorConfig;
    reqInfo.reqBody = JSON.parse(reqInfo.reqBody); //产品id reqBody.invitation_group.product_list
    reqInfo.urlInfo = rpa.parseUrl(reqInfo.reqUrl);
    reqInfo.urlInfo.params = this.lastUrlParam;
    this.inviteCreatorConfig = reqInfo;

    //创建任务 开始拉取达人邀约
    appData.ExecuteTaskItem = {
      creatorNames: null,
      taskName: "批量邀约",
      executeNum: 0,
      executeTargetNum: appData.inviSettingUS.groupSize * appData.inviSettingUS.groupNum,
      startTime: appData.getFormatDate(new Date()),
      productIds: appData.inviSettingUS.inviteCreatorConfig.reqBody.invitation_group.product_list.map((f) => f.product_id),
    };
    console.log("创建任务完成：", appData.inviSettingUS);

    await rpa.instructMessage("开始执行邀约任务");
    await this.startInviteCreator(appData.inviSettingUS);
  },
  //查找达人邀约 指定达人邀约
  async startInviteCreator(taskConfig) {
    if (!taskConfig.findCreatorConfig) {
      await rpa.runMessage("查找达人筛选条件为空！");
      return false;
    }
    //查找达人邀约
    var taskRun = async function () {
      appData.executing = 1;
      //初始化查找达人拉取参数
      tikTokApi.initializeFindCreator();
      //删除计划
      if (taskConfig.useClearInvitePlan) {
        for (const productId of appData.ExecuteTaskItem.productIds) {
          await rpa.runMessage("开始清空本地记录定向合作 商品ID：" + productId);
          await dbApi.delShopInvitePlan(appData.shopId, productId);
        }
      }
      if (taskConfig.useLocalCheck) {
        await rpa.runMessage("正在获取本地记录定向合作");
        await dbApi.getShopInvitePlan(appData.shopId);
      }
      if (taskConfig.useSyncInvitePlan) {
        await rpa.runMessage("正在获取本地记录定向合作");
        await dbApi.getShopInvitePlan(appData.shopId);
        await rpa.runMessage("正在检查定向合作配置");
        for (const productId of appData.ExecuteTaskItem.productIds) {
          await tikTokApi.getInviteHistory(productId);
        }
      }

      do {
        if (appData.executing == 0) {
          break;
        }
        await rpa.sleep(10)
        //根据不同来源获取达人 
        var creators = [];
        await rpa.feedbackTrack('', false);                  //暂停
        switch (taskConfig.source) {
          case 'findCreator':
            await rpa.runMessage("查找达人 请稍候");
            creators = await tikTokApi.getFindCreatorListV2(taskConfig.findCreatorConfig.reqBody, 20);
            break;
          case 'assignCreator':
            await rpa.runMessage("获取指定达人信息 请稍候");
            creators = await tikTokApi.getAssignCreatorList(taskConfig.assignExcelNamePath, 50);
            break;
        }
        if (creators && creators.length > 0) {
          // rpa.runMessage(appData.GetTranText("获取到达人数：") + creators.length);
          let addInviteOk = false
          let skipInvitedNum = 0
          for (const creator of creators) {
            await rpa.sleep(10);
            if (appData.executing == 0) {
              break;
            }
            if (creator.isOnlyLinkSharing) {
              await rpa.runMessage(`跳过仅分享链接达人：${creator.creatorName}`);
              continue
            }

            // // 检查白名单
            // if (adminApi.IsInvited(creator.creatorName)) {
            //     console.log("验证白名单已存在跳过：" + creator.creatorName);
            //     continue;
            // }

            //检查重复邀约
            if (tikTokApi.checkInviteHistory([creator.creatorId]).length > 0) {
              //  await rpa.runMessage('跳过当前商品已邀约达人：', creator.creatorName);
              skipInvitedNum++
              continue;
            }
            if (appData.CurrentUSTalentList.length < taskConfig.groupSize) {
              appData.CurrentUSTalentList.push(creator);
              await rpa.runMessage(`找到可用达人：${creator.creatorName} (${appData.CurrentUSTalentList.Count()}/${taskConfig.groupSize}) `);
              addInviteOk = true
            }
            if (tikTokApi.CheckUSTalentListIsFull()) {
              //发起邀约
              await tikTokApi.startBatchInvite();
              //邀约间隔
              if (taskConfig.execSpeed > 0) {
                await rpa.sleep(taskConfig.execSpeed * 1000);
              } else {
                await rpa.sleep(1000);
              }
            }
          }
          await rpa.runMessage(`本次跳过已邀约达人数：${skipInvitedNum}`);
          if (addInviteOk) {
            tikTokApi.failInviteChatTime = 0
          } else {
            tikTokApi.failInviteChatTime++
          }
        }
      } while (true);

      //最后发送一次
      if (appData.CurrentUSTalentList.length > 0) {
        await tikTokApi.startBatchInvite();
      }

      await rpa.sleep(1000);
      await bootScript.stop();
      await rpa.runMessage(`已停止任务 共邀约达人：${appData.ExecuteTaskItem.executeNum}`);
    };
    await taskRun();

    return true;
  },
  //打开邀约页面
  async openInvitePage() {
    //邀约配置页
    var pageCreateInvite = await rpa.getPage("connection/target-invitation/create?");
    if (!pageCreateInvite) {
      let inviteUrl = `${appData.TKFindCreatorUrlInfo.domain}/connection/target-invitation/create?enter_from=affiliate_find_creators&enter_method=target_invite&pair_source=author_recommend&shop_region=${appData.regionCode}`;
      if (this.firstCreator && this.firstCreator.creator_oecuid && this.firstCreator.creator_oecuid.value) {
        inviteUrl += `&creator_ids[0]=${this.firstCreator.creator_oecuid.value}`;
      }
      this.pageCreateInvite = await rpa.openPage(inviteUrl);
    } else {
      this.pageCreateInvite = pageCreateInvite.id;
    }
    await bootScript.injectionJs(`sliderHandle.js`, this.pageCreateInvite);
    // await rpa.callPageJS(this.pageCreateInvite, "sliderHandle.checkSlider", 20, 0);
    await rpa.activePage(this.pageCreateInvite)
    return pageCreateInvite;
  },

  //#endregion

  //#region 私信

  async createChatTask() {
    const taskType = "私信"

    //获取或创建配置
    var defConfig = {
      id: appData.getUUID(),
      name: "私信_" + DateTime.Now.ToString("yyyyMMdd"),
      taskType,
      source: 'findCreator',         //达人来源
      assignExcelNamePath: null,     //指定达人的文件路径
      save: true,
      shopId: appData.shopId,
      shopName: appData.shopName,
      regionName: appData.GetReginName(appData.regionCode),
      regionCode: appData.regionCode,
      execSpeed: 1,

      msgItems: [],
      targetNum: 100,         //目标人数
      skipDays: 0,            //过滤天数 0不过滤
      skipChated: false,      //已沟通都跳过
      skipReply: false,       //跳过待回复

      findCreatorConfig: null,
    };
    var appInfo = await rpa.getAppInfo();
    if (appInfo.RunParameter) {
      var runParam = JSON.parse(appInfo.RunParameter);
      runParam.runConfigs = runParam.runConfigs.filter((w) => w.shopId == appData.shopId && w.taskType == taskType);
      runParam.currConfig = defConfig;
      globalVar.AppRunParameters = runParam;
    } else {
      //第一次使用初始化数据
      globalVar.AppRunParameters = {
        runConfigs: [],
        currConfig: defConfig,
      };
    }
    await rpa.instructMessage("等待配置任务参数");
    // console.log('弹窗参数：', globalVar.AppRunParameters);
    globalVar.AppRunParameters = await bootScript.showDialogForm(`createTkChat.html`, JSON.stringify(globalVar.AppRunParameters), 1500, 950, -1, -1, true);
    if (!globalVar.AppRunParameters) {
      return;
    }

    // console.log('弹窗返回数据：', globalVar.AppRunParameters);
    await rpa.instructMessage("开始配置查找达人条件");
    var keyword = `api/v1/oec/affiliate/creator/marketplace/find`;
    await rpa.regReqMon(this.pageFindCreator, keyword, `window.bootScript.onFindSearch`, null, null, false);
    if (!globalVar.AppRunParameters.currConfig.useOldParam) {
      //取达人配置
      rpa.runMessage("请在查找达人配置好筛选条件 点击关键字旁搜索按钮 进入下一步");
      globalVar.AppRunParameters = await bootScript.showDialogForm(`createTkChat.html?step=2`, JSON.stringify(globalVar.AppRunParameters), 800, 175, -1, 0, true);
      if (!globalVar.AppRunParameters) {
        rpa.runMessage("未配置完成任务 结束运行");
        return;
      }
      //点击下一步表示确定选择好条件 执行一次点击搜索按钮
      setTimeout(async () => {
        await rpa.callPageRpa(this.pageFindCreator, "click", "达人广场搜索按钮", true, false, 0);
      }, 1000);
      await rpa.instructMessage("等待配置查找达人条件 点击搜索按钮");
      await rpa.wait(0, "waitFindCreator");
      // //关闭网页 _pageCreateInvite
      // await rpa.closePage(this..pageCreateInvite);
      await rpa.activePage(this.pageFindCreator);
      //处理最新配置
      globalVar.AppRunParameters.currConfig.findCreatorConfig = this.findCreatorConfig;
    }
    //更新或者新增模板
    if (globalVar.AppRunParameters.currConfig.save && globalVar.AppRunParameters.currConfig.name) {
      var old = globalVar.AppRunParameters.runConfigs.filter((w) => w.id == globalVar.AppRunParameters.currConfig.id).FirstOrDefault();
      if (old) {
        globalVar.AppRunParameters.runConfigs.Remove(old);
      }
      globalVar.AppRunParameters.runConfigs.push(globalVar.AppRunParameters.currConfig);
      appInfo.RunParameter = JSON.stringify(globalVar.AppRunParameters);
      await rpa.saveAppParameter(appInfo);
      // console.log('保存配置：', appInfo, JSON.parse(appInfo.RunParameter));
    }
    //检查是否需要获取最新url参数
    if (!this.lastUrlParam) {
      //点击下一步表示确定选择好条件 执行一次点击搜索按钮
      do {
        await rpa.instructMessage("等待点击 查找达人搜索按钮");
        await rpa.callPageRpa(this.pageFindCreator, "click", "达人广场搜索按钮", false, false, 0);
        await rpa.wait(5, "waitFindCreator"); //等待5秒再继续执行
      } while (!this.lastUrlParam);
    }
    await rpa.cancelReqMon(this.pageFindCreator, keyword);

    await rpa.sleep(500);
    appData.chatInviSettingV2 = globalVar.AppRunParameters.currConfig;
    if (!appData.chatInviSettingV2.findCreatorConfig) {
      await rpa.instructMessage("检测到配置参数不完整 请重新配置任务参数！！!");
      this.stop();
      return;
    }

    //解析请求数据 查找达人请求 url参数都一样使用最新获取的
    var reqInfo = appData.chatInviSettingV2.findCreatorConfig;
    reqInfo.reqBody = JSON.parse(reqInfo.reqBody);
    reqInfo.urlInfo = rpa.parseUrl(reqInfo.reqUrl);
    reqInfo.urlInfo.params = this.lastUrlParam;
    this.findCreatorConfig = reqInfo;

    //创建任务 开始拉取达人邀约
    appData.ExecuteTaskItem = {
      creatorNames: null,
      taskName: "批量私信",
      executeNum: 0,
      executeTargetNum: appData.chatInviSettingV2.targetNum,
      startTime: appData.getFormatDate(new Date()),
    };
    console.log("创建任务完成：", appData.chatInviSettingV2);

    await rpa.instructMessage("开始执行私信任务");
    await this.startChatCreator(appData.chatInviSettingV2);
  },
  //查找达人私信 指定达人私信
  async startChatCreator(taskConfig) {
    if (!taskConfig.findCreatorConfig) {
      rpa.runMessage("查找达人筛选条件为空！");
      if (!appData.inDMClient) {
        return false;
      }
    }
    if (taskConfig.skipDays > 0) {
      rpa.runMessage("读取历史私信记录……");
      await dbApi.getShopChatHis(appData.shopId, appData.chatInviSettingV2.skipDays)
    }
    //查找达人
    var taskRun = async () => {
      appData.executing = 1;
      //初始化查找达人拉取参数
      tikTokApi.initializeFindCreator();
      do {
        if (appData.executing == 0) {
          break;
        }
        await rpa.sleep(10);
        //拉取达人
        var creators = []
        switch (taskConfig.source) {
          case 'findCreator':
            await rpa.runMessage("查找达人 请稍候");
            creators = await tikTokApi.getFindCreatorListV2(taskConfig.findCreatorConfig.reqBody, 20);
            break;
          case 'assignCreator':
            await rpa.runMessage("获取指定达人信息 请稍候");
            creators = await tikTokApi.getAssignCreatorList(taskConfig.assignExcelNamePath, 20);
            break;
        }
        if (creators && creators.length > 0) {
          // rpa.runMessage("获取到达人数：" + creators.length);
          for (const creator of creators) {
            await rpa.sleep(10);
            await rpa.feedbackTrack('', false);                //暂停
            if (appData.executing == 0) {
              break;
            }
            if (!creator.creatorName || !creator.creatorName) {
              continue;
            }
            try {
              if (tikTokApi.inDaysChated(creator)) {
                continue;
              }
              if (await tikTokApi.initialChat(creator)) {
                await bootScript.sendChatMessage(creator);
              }
            } catch (ex) {
              await rpa.runMessage("达人私信出错：" + ex);
            }
          }
        }
      } while (true);

      // await bootScript.sendChatMessage();
      if (this.pageAutoChat != -1) {
        await rpa.closePage(this.pageAutoChat)                //运行结束关闭私信窗口
      }
      await rpa.sleep(1000);
      await this.stop();
      await rpa.runMessage(`已停止任务 共私信达人：${appData.ExecuteTaskItem.executeNum}`);
    };
    await taskRun();

    return true;
  },
  //发送私信流程
  async sendChatMessage(creator) {
    //判断是否使用接口发私信
    if (!appData.chatInviSettingV2.isApiChat) {
      //   //测试接口私信
      //   if (tikTokApi.conversation_id) {
      //     var sendResult = await tikTokApi.protobufChatSend(creator.creatorName);
      //     console.log(sendResult);
      //     return false;
      //   }
      //打开弹窗开始发 repeatDay跳过天数
      var params = {
        creatorName: creator.creatorName,
        intervalSecond: appData.chatInviSettingV2.execSpeed,
        skipDays: appData.chatInviSettingV2.skipDays,
        skipChated: appData.chatInviSettingV2.skipChated,     //跳过已沟通
        skipReply: appData.chatInviSettingV2.skipReply,       //跳过达人有回复的
        msgItems: appData.chatInviSettingV2.msgItems,
      };
      var waitSecond = (200000 + appData.chatInviSettingV2.execSpeed * 1000 * params.msgItems.length) / 1000;
      // console.info("发送私信参数及等待执行任务秒数：", params, waitSecond);
      await rpa.runMessage(`开始私信达人：${params.creatorName}`);
      //打开私信页面
      this.pageAutoChat = await this.openChatForm(creator.creatorId);
      if (this.pageAutoChat != -1) {
        try {
          await rpa.activePage(this.pageAutoChat);
          //注册脚本并执行发送方法
          var sendR
          try {
            sendR = JSON.parse(await rpa.callPageJS(this.pageAutoChat, "storeSendChat.setChatConfigRun", waitSecond, JSON.stringify(params)));
          } catch (error) {
            await rpa.runMessage(`私信达人：${params.creatorName} 失败可能超时${error}`);
          }
          if (!sendR) {
            await rpa.runMessage(`私信失败`);
          } else if (sendR.sucNum == 0) {
            await rpa.runMessage(`私信失败 ${sendR.msg}`);
          } else if (sendR.sucNum > 0) {
            //发送成功记录达人信息
            creator.chatNum = sendR.sucNum;
            creator.createTime = DateTime.Now.ToString();
            appData.ExecuteTaskItem.executeNum++
            await dbApi.insUpdChatCreator(creator);
            await rpa.runMessage(`私信达人成功 发送消息数：${creator.chatNum}`);
            await rpa.instructMessage(`私信进度：${appData.ExecuteTaskItem.executeNum}/${appData.ExecuteTaskItem.executeTargetNum}`);
            //检查停止
            if (appData.ExecuteTaskItem.executeNum >= appData.ExecuteTaskItem.executeTargetNum) {
              await rpa.runMessage("私信人数已达到任务要求");
              await bootScript.stop();
            }
            return true;
          }
        } catch (error) {
          await rpa.runMessage(`私信达人过程出错：${error}`);
        }
        return false;
      }
    } else {
      //批量私信 仅支持部分地区
      if (await this.apiChatBatchSend()) {
        return false;
      }
    }

    return false;
  },
  childVarWinName: "", //打开窗口保存的变量名
  //返回窗口id大于0成功 -1失败
  async openChatForm(creatorId) {
    try {
      var url = `${appData.GetDomain()}seller/im?shop_id=${appData.shopId}&creator_id=${creatorId}&enter_from=affiliate_creator_details`;
      var openChatParam = {
        type: "open_conversation",
        payload: {
          shop_id: appData.shopId,
          creator_id: creatorId,
          enter_from: "affiliate_creator_details",
          url: url,
        },
      };
      let chatPageKeyword = "seller/im?shop_id="
      //这里应该同时检查私信窗口是否存在 不存在则应重新打开
      var pageChat = await rpa.getPage(chatPageKeyword, 1);
      let openPoupPage = async () => {
        if (await rpa.callPageRpa(this.pageFindCreator, "openPoupPage", this.childVarWinName, url, "_blank")) {
          pageChat = await rpa.getPage(chatPageKeyword, 1);
          if (pageChat) {
            // await bootScript.injectionJs(`csharpCode.js`, pageChat.id);
            await bootScript.injectionJs(`sendChat.js`, pageChat.id);
            return pageChat.id
          }
        }
        return -1;
      }

      if (this.childVarWinName) {
        if (!pageChat) {
          //如果私信页面被关闭则重新打开一个
          return await openPoupPage();
        } else {
          //页面存在则直接发消息切换达人
          await rpa.callPageRpa(this.pageFindCreator, "sendMsgChildPoup", this.childVarWinName, JSON.stringify(openChatParam));
          return pageChat.id
        }
      } else {
        //程序运行第一次打开
        this.childVarWinName = "chat";
        return await openPoupPage();
      }
    } catch (error) {
      console.error("打开私信弹窗出错：", error);
    }
    return -1;
  },

  //#endregion

  //#region 订单私信

  async createOrderChatTask() {
    const taskType = "订单私信";

    //#region 获取店铺和首页订单信息

    this.pageOrderInfo = await rpa.getPage("/order?", 2);
    if (!this.pageOrderInfo) {
      throw "请打开tk店铺并切到 订单->管理订单 页面配置好筛选订单条件再启动应用";
    }

    await rpa.instructMessage("打开店铺订单->管理订单页 设置筛选条件点击下一步");
    await bootScript.showDialogForm(`createTkOrderChat.html?step=1`, null, 800, 175, -1, 0, true);       //打开窗口提示操作下一步

    var keyword = `api/seller/mGetContactBuyerLinkByOrder`;             //订单接口关键字 监控获取店铺信息
    await rpa.regReqMon(this.pageOrderInfo.id, keyword, `window.bootScript.onGetContactBuyer`, null, null, false);
    //等会点击下一步表示确定选择好条件 执行一次点击搜索按钮
    setTimeout(async () => {
      await rpa.callPageRpa(this.pageOrderInfo.id, "inputKey", "订单页搜索框", 13);
    }, 1000);
    await rpa.instructMessage("等待点击搜索订单按钮获取店铺信息");
    await rpa.wait(0, "waitGetContactBuyer");                         //等待请求任务响应

    //#endregion

    //获取或创建配置 要先根据订单接口获取到地区和店铺id
    var defConfig = {
      id: appData.getUUID(),
      name: "订单私信_" + DateTime.Now.ToString("yyyyMMdd"),
      taskType,
      save: true,
      shopId: appData.shopId,
      // shopName: appData.shopName,
      regionName: appData.GetReginName(appData.regionCode),
      regionCode: appData.regionCode,
      execSpeed: 1,

      msgItems: [],
      // targetNum: 100, //目标人数
      skipDays: 0, //过滤天数 0不过滤
      skipChated: false, //已沟通都跳过
      skipReply: false, //跳过待回复 
    };
    var appInfo = await rpa.getAppInfo();
    if (appInfo.RunParameter) {
      var runParam = JSON.parse(appInfo.RunParameter);
      runParam.runConfigs = runParam.runConfigs.filter((w) => w.shopId == appData.shopId && w.taskType == taskType);
      runParam.currConfig = defConfig;
      globalVar.AppRunParameters = runParam;
    } else {
      //第一次使用初始化数据
      globalVar.AppRunParameters = {
        runConfigs: [],
        currConfig: defConfig,
      };
    }

    await rpa.instructMessage("等待弹窗配置任务参数");
    // console.log('弹窗参数：', globalVar.AppRunParameters);
    globalVar.AppRunParameters = await bootScript.showDialogForm(`createTkOrderChat.html?step=2`, JSON.stringify(globalVar.AppRunParameters), 1500, 950, -1, -1, true);
    if (!globalVar.AppRunParameters) {
      return;
    }
    // console.log('弹窗返回数据：', globalVar.AppRunParameters);
    await rpa.instructMessage("开始执行任务");

    //更新或者新增模板
    if (globalVar.AppRunParameters.currConfig.save && globalVar.AppRunParameters.currConfig.name) {
      var old = globalVar.AppRunParameters.runConfigs.filter((w) => w.id == globalVar.AppRunParameters.currConfig.id).FirstOrDefault();
      if (old) {
        globalVar.AppRunParameters.runConfigs.Remove(old);
      }
      globalVar.AppRunParameters.runConfigs.push(globalVar.AppRunParameters.currConfig);
      appInfo.RunParameter = JSON.stringify(globalVar.AppRunParameters);
      await rpa.saveAppParameter(appInfo);
      // console.log('保存配置：', appInfo, JSON.parse(appInfo.RunParameter));
    }
    await rpa.sleep(500);
    appData.chatOrderBuyerSetting = globalVar.AppRunParameters.currConfig;

    //创建任务 开始拉取达人邀约
    appData.ExecuteTaskItem = {
      taskName: "订单买家私信",
      executeNum: 0,
      executeTargetNum: 0,
      startTime: appData.getFormatDate(new Date()),
    };
    console.log("创建任务完成：", appData.chatOrderBuyerSetting);

    await rpa.instructMessage("开始执行私信任务");
    await this.startOrderChat();
  },
  //查找订单私信
  async startOrderChat() {
    appData.executing = 1;

    var taskRun = async () => {
      do {
        if (appData.executing == 0) {
          break;
        }
        //发送已取到订单买家 数据格式：[{orderId, urlPc, pigeonUid, urlParams}] 
        for (; this.orderBuyerItems.length > 0;) {
          await rpa.feedbackTrack('', false);             //暂停
          if (appData.executing == 0) {
            break;
          }
          let buyer = this.orderBuyerItems.shift()                        //出队 按取到买家顺序发
          if (buyer) {
            //检查过滤天数
            if (await dbApi.checkChatBuyerExist(appData.shopId, buyer.pigeonUid, appData.chatOrderBuyerSetting.skipDays)) {
              await rpa.runMessage(`跳过已私信买家 订单ID：${buyer.orderId}`);
              continue;
            }
            await rpa.runMessage('开始私信 订单ID：' + buyer.orderId)
            await this.sendOrderChatMessage(buyer);
          }
        }

        //检查下一页禁用按钮存在则停止
        var btnNextPageDisabled = "订单页下一页禁用"
        if (await rpa.callPageRpa(this.pageOrderInfo.id, "waitInDoc", btnNextPageDisabled, 2, false)) {       //检查订单页下一页禁用按钮是否存在
          await rpa.runMessage("符合条件的订单全部读完 即将停止运行");
          break
        }
        //点击下一页继续取买家私信连接
        var btnNextPage = "订单页下一页"
        if (await rpa.callPageRpa(this.pageOrderInfo.id, "waitInDoc", btnNextPage, 10, false)) {               //检查订单页下一页按钮是否存在
          await rpa.runMessage("获取下一页订单数据……");
          await rpa.callPageRpa(this.pageOrderInfo.id, "click", btnNextPage)                                    //点击下一页  
          await rpa.wait(30, "waitGetContactBuyer");
          continue
        }
      } while (true);

      if (this.pageAutoChat != -1) {
        await rpa.closePage(this.pageAutoChat)                //运行结束关闭私信窗口
      }
      await rpa.sleep(1000);
      this.stop();
      await rpa.runMessage(`已停止任务 共私信达人：${appData.ExecuteTaskItem.executeNum}`);
    }

    await taskRun();
    return true;
  },
  //发送私信流程
  async sendOrderChatMessage(buyerItem) {
    //打开弹窗开始发 repeatDay跳过天数
    var params = {
      buyerId: buyerItem.pigeonUid,
      intervalSecond: appData.chatOrderBuyerSetting.execSpeed,
      skipChated: appData.chatOrderBuyerSetting.skipChated,             //跳过已沟通
      skipReply: appData.chatOrderBuyerSetting.skipReply,               //跳过达人有回复的
      msgItems: appData.chatOrderBuyerSetting.msgItems,
    };
    // await rpa.runMessage('发送私信参数：', params)
    var waitSecond = (60000 + appData.chatOrderBuyerSetting.execSpeed * 1000 * params.msgItems.length) / 1000;
    //每次打开都要等待创建私信成功
    this.createOrderChatOk = false
    //打开私信页面
    this.pageAutoChat = await this.openOrderChatForm(buyerItem);
    if (this.pageAutoChat != -1) {
      try {
        if (!this.createOrderChatOk) {
          rpa.runMessage(`创建私信失败可能无法发送私信 订单ID：${buyerItem.orderId}`);
          return false;
        }
        await rpa.activePage(this.pageAutoChat);
        //执行发送方法 
        var sendR = JSON.parse(await rpa.callPageJS(this.pageAutoChat, "orderSendChat.setChatConfigRun", waitSecond, JSON.stringify(params)));
        if (!sendR) {
          rpa.runMessage(`私信买家失败`);
          return false;
        } else if (sendR.sucNum == 0) {
          rpa.runMessage(`私信买家未发送`);
        } else if (sendR.sucNum > 0) {
          rpa.runMessage(`私信买家成功`);
          appData.ExecuteTaskItem.executeNum++
          //记录达人信息
          buyerItem.chatNum = sendR.sucNum;
          buyerItem.createTime = DateTime.Now.toISOString();
          await dbApi.insUpdChatOrder(buyerItem);
          return true;
        }
      } catch (error) {
        rpa.runMessage(`私信买家失败 可能超时 消息：${error}`);
      }
    }

    return false;
  },
  orderChildVarWinName: "", //打开窗口保存的变量名
  createOrderChatOk: false,
  //返回窗口id大于等于0成功 -1失败
  async openOrderChatForm(buyerItem) {
    var orderPageKeyword = "/chat/inbox/current?"               //私信页url关键字
    try {
      var url = this.pageOrderInfo.domain + buyerItem.urlPc;
      var openChatParam = {
        type: "oec_im_pc_open_conversation",
        payload: buyerItem.urlParams,
      };
      var pageChat = await rpa.getPage(orderPageKeyword, 2);
      let openPoupPage = async () => {
        if (await rpa.callPageRpa(this.pageOrderInfo.id, "openPoupPage", this.orderChildVarWinName, "about:blank", "_blank", '', false)) {
          pageChat = await rpa.getPage("about:blank");                         //先打开空白页获取当前打开的页面
          if (pageChat) {
            //监控请求判断创建成功
            await rpa.regReqMon(pageChat.id, 'api/v1/shop_im/shop/conversation/create_conversation', 'window.bootScript.onCreateConversation', null, null, false)
            await rpa.callPageJS(pageChat.id, `window.location.href='${url}'`, 2)
            await rpa.wait(20, 'waitCreateConversation')
            // await bootScript.injectionJs(`csharpCode.js`, pageChat.id);
            await bootScript.injectionJs(`sendChat.js`, pageChat.id);        //不管有没有创建私信成功都注入脚本 下次成功即可直接发
            return pageChat.id
          }
        }
        return -1;
      }
      //这里应该同时检查私信窗口是否存在 不存在则应重新打开
      if (this.orderChildVarWinName) {
        if (!pageChat) {
          //如果私信页面被关闭则重新打开
          return openPoupPage()
        } else {
          //页面存在则直接发消息切换达人
          await rpa.callPageRpa(this.pageOrderInfo.id, "sendMsgChildPoup", this.orderChildVarWinName, JSON.stringify(openChatParam));
          await rpa.wait(20, 'waitCreateConversation')
          return pageChat.id;
        }
      } else {
        //第一次打开
        this.orderChildVarWinName = "orderChat";
        return openPoupPage()
      }
    } catch (error) {
      console.error("打开订单私信弹窗出错：", error);
    }
    return -1;
  },
  //等待创建私信完成
  async onCreateConversation(json) {
    var reqInfo = JSON.parse(json);
    // console.log('创建聊天室结果', reqInfo)
    if (reqInfo.respBody) {
      let respObj = JSON.parse(reqInfo.respBody);
      if (respObj && respObj.code == 0 && respObj.data) {
        //成功
        this.createOrderChatOk = true
      }
    }
    rpa.wake('waitCreateConversation')                  //唤醒此任务
  },

  //#endregion


  // //调用此方法反馈运行指令位置 界面操作停止运行后会抛出异常终止运行
  // async feedbackTrack(desc) {
  //   await window.rpaVue.showFeedbackTrackDesc(desc);
  // },
  //开始运行
  async start(params = null, isDebug = false) {
    rpa.runMessageWriteRunLog = true;                         //运行日志记录到文件
    window.rpaVue.callbackStop = function () {                //注册停止回调函数
      bootScript.stop();
    };
    bootScript.isDebug = isDebug;
    await rpa.instructMessage("开始配置任务");
    //加载云脚本
    await bootScript.injectionJs(`csharpCode.js`);
    await bootScript.injectionJs(`appData.js`);
    await bootScript.injectionJs(`dbApi.js`);
    await bootScript.injectionJs(`tikTokApi.js`);
    await bootScript.injectionJs(`protobuf.js`);
    console.log("当前环境isDebug：", bootScript.isDebug);

    // await rpa.wait(0);
    switch (params) {
      case "邀约":
        await this.getFindCreatorInfo()
        await this.createInviteTask();
        break;
      case "私信":
        await this.getFindCreatorInfo()
        await this.createChatTask();
        break;
      case "订单私信":
        await this.createOrderChatTask();
        break;
      default:
        break;
    }
  },
  //停止通知
  async stop(params) {
    if (appData.executing != 0) {
      rpa.runMessage("正在停止运行任务……");
      appData.executing = 0;
    }
  },

  /**
  * 是不是测试环境
  */
  isDebug: false,
  /**
   * 注册脚本到指定页 会根据环境判断使用本地脚本或远程脚本
   * @param {*} scriptName 
   * @param {*} id 
   * @param {*} refreshInject 
   * @returns 
   */
  async injectionJs(scriptName, id = -1, refreshInject = true) {
    if (this.isDebug) {
      return await rpa.injectionJs(scriptName, id, refreshInject)
    } else {
      return await rpa.injectionJs(`https://wangxun0918.github.io/rpaChrome/appData/测试抖店/Script/${scriptName}`, id, refreshInject)
    }
  },
  /**
   * 加载显示html页面弹窗 会根据环境判断使用本地脚本或远程脚本
   * @param {*} htmlName 
   * @param {*} jsonAppConfig 
   * @param {*} width 
   * @param {*} height 
   * @param {*} left 
   * @param {*} top 
   * @param {*} topMost 
   * @param {*} waitLoadSecoend 
   * @returns 
   */
  async showDialogForm(htmlName, jsonAppConfig = null, width = 1000, height = 700, left = -1, top = -1, topMost = false, waitLoadSecoend = 1) {
    if (this.isDebug) {
      return await rpa.showDialogForm(htmlName, jsonAppConfig, width, height, left, top, topMost, waitLoadSecoend)
    } else {
      return await rpa.showDialogForm(`https://wangxun0918.github.io/rpaChrome/appData/测试抖店/Html/${htmlName}`, jsonAppConfig, width, height, left, top, topMost, waitLoadSecoend)
    }
  }

};

console.log("bootScript加载完成");
