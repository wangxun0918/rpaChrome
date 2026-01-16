var tikTokApi = {

  //#region 查找达人

  /**
   * 是否需要切换区间
   */
  changeFollower: false,
  /**
   * 连续无可用达人切换区别次数
   */
  changeFollowerWaitTime: 3,
  /**
   * 查找达人下一页页码
   */
  nextPage: 0,

  /**
   * 区间大小系数同时按此递减 数值越大区间降低速度越快区间也越大 0.04 0.05 0.06
   */
  followerSizePercent: 0.5,
  /**
   * 执行过程左侧区间系数 到0从0.94开始
   */
  followerLeftPercentNum: 1.0 - this.followerSizePercent,
  /**
   * 当前区间获取的达人连续多次无法使用就切换区间 
   */
  failInviteChatTime: 0,

  /**
   * 获取查找达人列表 按粉丝区间递减执行 区间范围越来越小
   * @param {*} reqBody 
   * @param {*} needNum 
   * @returns 
   */
  async getFindCreatorList(reqBody, needNum = 50) {
    var creators = [];
    try {
      await rpa.sleep(100)
      var defReq = rpa.copyObject(reqBody);

      if (this.failInviteChatTime > this.changeFollowerWaitTime) {
        rpa.runMessage('连续多次未找到可成功操作达人切换区间……')
        this.changeFollower = true                  //连续三次取不到可用达人则切换区间
      }

      // var follower_cnt_min = 0;
      var follower_cnt_max = 10000000;
      //用户未设置粉丝区间则给默认0到300w
      if (defReq.filter_params && !defReq.filter_params.follower_filter) {
        defReq.filter_params.follower_filter = {};
        defReq.filter_params.follower_filter.left_bound = 0;
        defReq.filter_params.follower_filter.right_bound = 1000000;
      }
      //-1是无穷大 初始粉丝区间
      if (defReq.filter_params.follower_filter.right_bound == -1) {
        defReq.filter_params.follower_filter.right_bound = follower_cnt_max;                //1千万
      }

      //切换区间
      if (this.changeFollower) {
        this.nextPage = 0;
        this.changeFollower = false;
        //处理区间系数 到0重置
        if (this.followerLeftPercentNum <= 0) {
          //每次重置后降低切换区间大小系数切的更细 加大切换区间难度
          this.changeFollowerWaitTime += 2
          this.followerSizePercent = this.followerSizePercent / 2;
          this.followerLeftPercentNum = appData.roundToDecimal(1.0 - this.followerSizePercent, 2);
          console.info("跑完一轮重置参数：", this.followerSizePercent, this.followerLeftPercentNum);
        } else {
          //正常计算
          this.followerLeftPercentNum = appData.roundToDecimal(this.followerLeftPercentNum - this.followerSizePercent, 2);
          if (this.followerLeftPercentNum < 0) {
            this.followerLeftPercentNum = 0;
          }
        }
        // console.info("切换区间后左侧区间系数：", this.followerLeftPercentNum);
      }

      //计算小区间左侧和右侧
      var right = appData.roundToDecimal(this.followerLeftPercentNum + this.followerSizePercent, 2);
      if (this.followerLeftPercentNum < 0 || right > 1) {
        // console.error("无效变换左侧区间系数：", this.followerLeftPercentNum, right);
        this.changeFollower = true                    //计算区间过程发现区间系数异常
        return creators
      }
      var sourceAreaSize = defReq.filter_params.follower_filter.right_bound - defReq.filter_params.follower_filter.left_bound;
      defReq.filter_params.follower_filter.left_bound = defReq.filter_params.follower_filter.left_bound + parseInt(sourceAreaSize * this.followerLeftPercentNum);
      defReq.filter_params.follower_filter.right_bound = defReq.filter_params.follower_filter.left_bound + parseInt(sourceAreaSize * this.followerSizePercent);

      //粉丝区间范围过小停止
      if (defReq.filter_params.follower_filter.right_bound - defReq.filter_params.follower_filter.left_bound < 1000) {
        await rpa.runMessage(`暂时无法找到符合条件的新达人 请更改查找达人筛选条件或更换商品再试 建议增加粉丝区间范围`)
        bootScript.stop()
        return creators
      }
      //粉丝区间递减系数过小停止
      if (this.followerSizePercent < 0.005) {
        await rpa.runMessage(`暂时无法找到符合条件的新达人 请更改查找达人筛选条件或更换商品再试`)
        bootScript.stop()
        return creators
      }
      // // 测试打印区间
      // console.info(`当前执行筛选粉丝区间：${defReq.filter_params.follower_filter.left_bound},${defReq.filter_params.follower_filter.right_bound}`);
      // this.changeFollower = true
      // await rpa.sleep(10)
      // return creators

      var fetchFailTime = 0;                                 //连续取失败超过 指定次数就换区间
      var fetchNoNewCreatorTime = 0;                         //连续取不到新达人 超过指定次数就换区间
      var pageNum = 999;

      defReq.algorithm = 26; //按粉丝区间排序
      defReq.pagination.size = 20;

      for (let i = this.nextPage; i < pageNum; i++) {
        //更新下一页页码
        this.nextPage = i + 1;
        if (appData.executing == 0) {
          break;
        }
        await rpa.sleep(1000 * 1);
        //动态参数处理
        defReq.pagination.page = i;
        await rpa.runMessage("达人粉丝区间：" + `${defReq.filter_params.follower_filter.left_bound}-${defReq.filter_params.follower_filter.right_bound} 页码：${defReq.pagination.page + 1}`);
        var respSearch = await this.findCreatorsAsync(defReq);
        if (!respSearch) {
          if (i > -1) {
            i--;
          }
          await rpa.runMessage("可能网络不稳定：", respSearch);
          // await rpa.sleep(3 * 1000);
          continue;
        }
        //滑块检测
        if (await appData.checkShowSlider(respSearch, "查找达人遇到滑块验证 请等待识别验证（若多次无法通过验证请人工操作）……", true, 20)) {
          if (i > -1) {
            i--; //重试当前页
          }
          continue;
        }
        if (!respSearch.next_pagination) {
          if (i > -1) {
            i--;
          }
          await rpa.runMessage("可能网络不稳未正确返回达人数据", respSearch);
          // await rpa.sleep(3 * 1000);
          continue;
        }
        //当前条件读取结束 应对无数据的情况
        if (!respSearch.next_pagination.has_more && (!respSearch.creator_profile_list || respSearch.creator_profile_list.length == 0)) {
          if (fetchFailTime >= 3) {
            rpa.runMessage('连续多次未找到达人切换区间……')
            //需要更换区间 
            this.changeFollower = true;
            break;
          }
          //失败次数增加 并重试当前页
          fetchFailTime++;
          if (i > -1) {
            i--;
          }
          rpa.runMessage("可能筛选条件要求过高无法匹配到达人将重试：" + fetchFailTime + " 次");
          await rpa.sleep(1000);
          continue;
        }
        fetchFailTime = 0;

        //抓取保存达人信息
        var pageCreators = [];
        this.handleFindCreator(respSearch, pageCreators);
        //console.info("抓取到达人：", creators);

        //过滤已使用达人
        var newCreators = [];
        for (const element of pageCreators) {
          if (appData.ReadFindCreatorNameList.includes(element.creatorName)) {
            // console.info("跳过已使用达人：", element.creatorName);
            continue;
          }
          appData.ReadFindCreatorNameList.Add(element.creatorName);
          newCreators.Add(element);
        }
        rpa.runMessage("找到新达人数：" + newCreators.length);
        if (newCreators.length == 0) {
          fetchNoNewCreatorTime++               //统计连续取不到新达人次数
          if (fetchNoNewCreatorTime >= this.changeFollowerWaitTime) {
            rpa.runMessage('连续多次未找到新达人切换区间……')
            this.changeFollower = true;
            // i += 3              //跳页
            break
          }
        } else {
          fetchNoNewCreatorTime = 0
        }
        creators.AddRange(newCreators);

        //达到需求人数暂停
        if (creators.length >= needNum) {
          break;
        }

        //正常返回数据且读完
        if (!respSearch.next_pagination.has_more) {
          //需要更换区间
          this.nextPage = 0;
          this.changeFollower = true;
          console.info("分页已读完");
          await rpa.sleep(1000);
          break;
        }
      }

      //最大读999页
      if (this.nextPage >= pageNum) {
        this.changeFollower = true;
        this.nextPage = 0;
      }
    } catch (error) {
      console.error("拉取达人出错：", error);
    }
    return creators;
  },
  /**
   * 所有粉丝区间
   */
  allFollowerArea: null,
  /**
   * 当前使用的区间
   */
  currUseFollowerArea: null,
  async getFindCreatorListV2(reqBody, needNum = 50) {
    var creators = [];
    try {
      await rpa.sleep(100)
      var defReq = rpa.copyObject(reqBody);

      if (this.failInviteChatTime > this.changeFollowerWaitTime) {
        await rpa.runMessage('连续多次未找到可成功操作达人')
        this.changeFollower = true                  //连续三次取不到可用达人则切换区间
      }

      // var follower_cnt_min = 0;
      var follower_cnt_max = 10000000;
      //用户未设置粉丝区间则给默认0到300w
      if (defReq.filter_params && !defReq.filter_params.follower_filter) {
        defReq.filter_params.follower_filter = {};
        defReq.filter_params.follower_filter.left_bound = 0;
        defReq.filter_params.follower_filter.right_bound = 1000000;
      }
      //-1是无穷大 初始粉丝区间
      if (defReq.filter_params.follower_filter.right_bound == -1) {
        defReq.filter_params.follower_filter.right_bound = follower_cnt_max;                //1千万
      }

      //第一次运行生成所有粉丝区间
      if (!this.allFollowerArea) {
        //生成区间大小为1000的小区间
        this.allFollowerArea = this.generateAllFollowerArea(defReq.filter_params.follower_filter.left_bound, defReq.filter_params.follower_filter.right_bound, (defReq.filter_params.follower_filter.right_bound - defReq.filter_params.follower_filter.left_bound) / 1000)
        // console.log(`生成区间数：${this.allFollowerArea.length} 具体：`, this.allFollowerArea)
      }

      //切换区间
      if (this.changeFollower || !this.currUseFollowerArea) {
        this.nextPage = 0;
        this.changeFollower = false;
        //区间用完停止
        if (this.allFollowerArea.length == 0) {
          await rpa.runMessage(`暂时无法找到符合条件的新达人 请更改查找达人筛选条件或更换商品再试 建议增加粉丝区间范围`)
          bootScript.stop()
          return creators
        }
        //寻找随机区间
        var randomNum = rpa.getRandomNum(0, this.allFollowerArea.length - 1)
        this.currUseFollowerArea = this.allFollowerArea[randomNum]
        this.allFollowerArea.Remove(this.currUseFollowerArea)
        await rpa.runMessage(`切换粉丝区间至：`, this.currUseFollowerArea);
      }

      //使用随机区间
      if (this.currUseFollowerArea) {
        defReq.filter_params.follower_filter.left_bound = this.currUseFollowerArea.start;
        defReq.filter_params.follower_filter.right_bound = this.currUseFollowerArea.end;
      }

      var fetchFailTime = 0;                                 //连续取失败超过 指定次数就换区间
      var fetchNoNewCreatorTime = 0;                         //连续取不到新达人 超过指定次数就换区间
      var pageNum = 999;

      defReq.algorithm = 1; //排序1相关性 18交易总额 20成交件 26粉丝 24平均视频播放量 22互动率
      defReq.pagination.size = 20;

      for (let i = this.nextPage; i < pageNum; i++) {
        //更新下一页页码
        this.nextPage = i + 1;
        if (appData.executing == 0) {
          break;
        }
        await rpa.sleep(1000 * 1);
        //动态参数处理
        defReq.pagination.page = i;
        await rpa.runMessage("达人粉丝区间：" + `${defReq.filter_params.follower_filter.left_bound}-${defReq.filter_params.follower_filter.right_bound} 页码：${defReq.pagination.page + 1}`);
        var respSearch = await this.findCreatorsAsync(defReq);
        if (!respSearch) {
          if (i > -1) {
            i--;
          }
          await rpa.runMessage("可能网络不稳定：", respSearch);
          // await rpa.sleep(3 * 1000);
          continue;
        }
        //滑块检测
        if (await appData.checkShowSlider(respSearch, "查找达人遇到滑块验证 请等待识别验证（若多次无法通过验证请人工操作）……", true, 20)) {
          if (i > -1) {
            i--; //重试当前页
          }
          continue;
        }
        if (!respSearch.next_pagination) {
          if (i > -1) {
            i--;
          }
          await rpa.runMessage("可能网络不稳未正确返回达人数据", respSearch);
          // await rpa.sleep(3 * 1000);
          continue;
        }
        //当前条件读取结束 应对无数据的情况
        if (!respSearch.next_pagination.has_more && (!respSearch.creator_profile_list || respSearch.creator_profile_list.length == 0)) {
          if (fetchFailTime >= 1) {
            rpa.runMessage('连续多次未找到达人')
            //需要更换区间 
            this.changeFollower = true;
            break;
          }
          //失败次数增加 并重试当前页
          fetchFailTime++;
          if (i > -1) {
            i--;
          }
          rpa.runMessage("可能筛选条件要求过高在当前区间无法匹配到达人将重试：" + fetchFailTime + " 次");
          await rpa.sleep(1000);
          continue;
        }
        fetchFailTime = 0;

        //抓取保存达人信息
        var pageCreators = [];
        this.handleFindCreator(respSearch, pageCreators);
        //console.info("抓取到达人：", creators);

        //过滤已使用达人
        var newCreators = [];
        for (const element of pageCreators) {
          if (appData.ReadFindCreatorNameList.includes(element.creatorName)) {
            // console.info("跳过已使用达人：", element.creatorName);
            continue;
          }
          appData.ReadFindCreatorNameList.Add(element.creatorName);
          newCreators.Add(element);
        }
        rpa.runMessage("找到新达人数：" + newCreators.length);
        if (newCreators.length == 0) {
          fetchNoNewCreatorTime++               //统计连续取不到新达人次数
          if (fetchNoNewCreatorTime >= this.changeFollowerWaitTime) {
            rpa.runMessage('连续多次未找到新达人……')
            this.changeFollower = true;
            // i += 3              //跳页
            break
          }
        } else {
          fetchNoNewCreatorTime = 0
        }
        creators.AddRange(newCreators);

        //达到需求人数暂停
        if (creators.length >= needNum) {
          break;
        }

        //正常返回数据且读完
        if (!respSearch.next_pagination.has_more) {
          //需要更换区间
          this.nextPage = 0;
          this.changeFollower = true;
          // console.info("分页已读完");
          await rpa.sleep(1000);
          break;
        }
      }

      //最大读999页
      if (this.nextPage >= pageNum) {
        this.changeFollower = true;
        this.nextPage = 0;
      }
    } catch (error) {
      console.error("拉取达人出错：", error);
    }
    return creators;
  },
  /**
   * 生成指定区间内的n个不重叠、连续的小区间
   * @param {number} start - 总区间起始值（如 1、100000）
   * @param {number} end - 总区间结束值（如 1000000、1000）
   * @param {number} n - 要生成的小区间数量
   * @returns {Array<Object>} 包含n个小区间的数组，每个区间有start和end属性
   */
  generateAllFollowerArea(start, end, n) {
    // 1. 参数校验
    if (typeof start !== 'number' || typeof end !== 'number' || typeof n !== 'number') {
      throw new Error('起始值、结束值、区间数量必须为数字');
    }
    if (start >= end) {
      throw new Error('起始值必须小于结束值');
    }
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('区间数量必须为正整数');
    }

    // 2. 计算每个小区间的步长（总长度 ÷ 区间数）
    const totalLength = end - start;
    const step = totalLength / n;

    // 3. 生成小区间
    const intervals = [];
    let currentStart = start;

    for (let i = 0; i < n; i++) {
      let currentEnd;
      // 最后一个区间强制对齐到end，避免精度误差
      if (i === n - 1) {
        currentEnd = end;
      } else {
        currentEnd = currentStart + step;
        // 处理小数（如果需要整数区间，可加这行）
        // currentEnd = Math.round(currentEnd);
      }

      intervals.push({
        start: parseInt(currentStart),
        end: parseInt(currentEnd)
      });

      // 下一个区间的起始 = 当前区间的结束（保证无重叠、连续）
      currentStart = currentEnd;
    }

    return intervals;
  },
  //查找达人列表
  async findCreatorsAsync(reqData) {
    var url = rpa.urlStringify(bootScript.findCreatorConfig.urlInfo);
    var resp = await this.fetchJsonAsync(url, {
      method: "POST",
      headers: bootScript.findCreatorConfig.reqHeader,
      body: JSON.stringify(reqData),
    });
    // rpa.runMessage("查找达人列表返回", resp);
    return resp;
  },
  initializeFindCreator() {
    this.changeFollower = false;
    this.nextPage = 0;
    // const numbers = [0.04, 0.05, 0.06];
    // const randomIndex = Math.floor(Math.random() * numbers.length);
    // this.followerSizePercent = numbers[randomIndex];
    this.followerSizePercent = 0.5
    this.followerLeftPercentNum = appData.roundToDecimal(1.0 - this.followerSizePercent, 2);

    this.allFollowerArea = null
    // rpa.runMessage("初始化参数 区间大小系数：" + this.followerSizePercent);
  },
  handleFindCreator(respObj, creators) {
    if (!respObj) {
      console.info("未拉取到达人数据请检查调整筛选条件", respObj);
      return;
    }
    if (respObj && respObj.creator_profile_list && respObj.creator_profile_list.length > 0) {
      for (let i = 0; i < respObj.creator_profile_list.length; i++) {
        const item = respObj.creator_profile_list[i];
        try {
          var creator = {};
          if (item.creator_oecuid.value) {
            creator.creatorId = item.creator_oecuid.value;
          }
          if (item.handle.value) {
            creator.creatorName = item.handle.value;
          }
          if (item.selection_region.value) {
            creator.regionCode = item.selection_region.value;
          }
          //类目
          if (item.category.value) {
            creator.categorys = item.category.value.map((f) => f.name).join(",");
          }
          // //直播平均观众数
          // if (item.ec_live_avg_uv.value) {
          //   creator.ec_live_avg_uv = item.ec_live_avg_uv.value;
          // }
          //粉丝数
          if (item.follower_cnt.value) {
            creator.fansNum = appData.GetNum(item.follower_cnt.value);
          }
          //视频平均播放数
          if (item.ec_video_avg_view_cnt.value) {
            creator.watchNum = appData.GetNum(item.ec_video_avg_view_cnt.value);
          }

          // //头像 { thumb_url_list: [,…], url_list: [,…] }
          // if (item.avatar && item.avatar.value) {
          //   creator.avatar = JSON.stringify(item.avatar.value);
          // }
          // //快速增长 is_fast_growing: {value: true, is_authorized: true, status: 0}
          // if (item.is_fast_growing && item.is_fast_growing.value) {
          //   creator.isFastGrowing = item.is_fast_growing.value;
          // }
          // //粉丝年龄区间 会有多个["11-15","22-33"]
          // if (item.top_follower_ages && item.top_follower_ages.value) {
          //   creator.ageRange = JSON.stringify(item.top_follower_ages.value);
          // }
          // //粉丝性别占比 一般只有一个 男{"key": "Male","value": "4953"} 女{"key": "Female","value": "4953"}
          // if (item.top_follower_gender && item.top_follower_gender.value) {
          //   creator.sexPercent = JSON.stringify(item.top_follower_gender.value);
          // }
          //成交额 med_gmv_revenue_range: {value: "₱10K+", is_authorized: true, status: 0}
          if (item.med_gmv_revenue && item.med_gmv_revenue.value && item.med_gmv_revenue.value.format) {
            creator.medGmv = item.med_gmv_revenue.value.value;
          }
          //成交额范围 med_gmv_revenue_range: {value: "₱10K+", is_authorized: true, status: 0}
          if (!creator.medGmv && item.med_gmv_revenue_range && item.med_gmv_revenue_range.value) {
            creator.medGmv = item.med_gmv_revenue_range.value;
          }
          //成交件数
          if (item.units_sold && item.units_sold.value) {
            creator.unitsSold = appData.GetNum(item.units_sold.value);
          }
          //互动率 所有百分比都要除以100
          if (item.video_engagement && item.video_engagement.value) {
            creator.videoEngagement = item.video_engagement.value;
          }
          //video_gmv
          if (item.video_gmv.value) {
            creator.videoGmv = appData.GetNum(item.video_gmv.value.value);
          }
          //直播gmv
          if (item.live_gmv.value) {
            creator.liveGmv = appData.GetNum(item.live_gmv.value.value);
          }
          //是否已添加到达人管理
          if (item.shop_collect_status && item.shop_collect_status.value) {
            creator.isAddCreatorAdmin = item.shop_collect_status.value;
          }
          //是否显示仅限链接分享 =1是 =2正常
          if (item.creator_permission_tag && item.creator_permission_tag.value) {
            creator.isOnlyLinkSharing = item.creator_permission_tag.value == 1;
          }

          creator.shopId = appData.shopId;
          creator.regionCode = appData.regionCode;
          creator.createTime = appData.getFormatDate();

          // //视频GPM
          // if (item.ec_video_gpm.value) {
          //   creator.ec_video_gpm_min = item.ec_video_gpm.value.minimal;
          //   creator.ec_video_gpm_max = item.ec_video_gpm.value.maximum;
          // }

          ////video_avg_view_cnt
          //if (item.video_avg_view_cnt.value) {
          //    creator.video_avg_view_cnt = item.video_avg_view_cnt.value;
          //}

          if (creator.creatorId && creator.creatorName) {
            creators.push(creator);
            //console.log("添加达人：", creator.creatorName);
          }
        } catch (e) {
          console.log("达人数据解析出错：", e);
        }
      }
    }
  },

  assignPageIndex: 1,
  assignExcelNames: null,               //指定excel文件内所有名字
  /**
   * 获取指定达人数据
   * @param {*} excelPath 
   * @param {*} needNum 
   */
  async getAssignCreatorList(excelPath, needNum = 20) {
    //打开excel读取 A列所有行
    if (!this.assignExcelNames) {
      let fileId = await rpa.openExcel(excelPath)
      this.assignPageIndex = 1
      this.assignExcelNames = await rpa.getAllRowValue(fileId, 'A')
      appData.ExecuteTaskItem.executeTargetNum = this.assignExcelNames.length
      await rpa.closeExcel(fileId)
    }

    let items = []

    let pageItems = this.assignExcelNames.Skip((this.assignPageIndex - 1) * needNum).Take(needNum);
    this.assignPageIndex++;
    if (pageItems.length == 0) {
      await rpa.runMessage("所有指定达人已操作完成");
      await bootScript.stop()                   //停止 
      return items
    }

    let importCreators = await this.importCheckCreator(pageItems)
    for (const creator of importCreators) {
      if (!creator.creatorId) {
        await rpa.runMessage(`无效达人：${creator.creatorName}`);     //跳过无效达人
        continue
      }
      creator.shopId = appData.shopId;                      //补充数据
      creator.regionCode = appData.regionCode;
      creator.createTime = appData.getFormatDate();
      items.push(creator)
    }
    return items
  },
  /**
   * 批量检查达人 可根据达人名称获取id 但依赖店铺达人管理功能
   * @param {*} handle_names 达人名数组
   */
  async importCheckCreator(names) {
    var items = [];
    try {
      var url = `${appData.GetDomain()}api/v1/oec/affiliate/crm/creator/import_check${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var req = {
        handle_names: names,
      };

      var result = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });

      if (result && result.code == 0 && result.data != null && result.data.creators) {
        result.data.creators.forEach((item) => {
          if (item.base.oec_id && item.base.oec_id != "0" && item.ec_info.with_ec_permission) {
            //有效的
            items.push({ creatorName: item.base.handle_name, creatorId: item.base.oec_id });
          } else {
            //无效的名称
            items.push({ creatorName: item.base.handle_name, creatorId: null, });
          }
        });
      }
    } catch {
      //return true;
    }

    return items;
  },
  //#endregion

  //#region 自动邀约

  /**
   * 验证达人是否可以邀约 不能验证重复邀约
   * @param {*} creatorName
   * @param {*} clearInviteCreatorItem
   * @returns
   */
  async checkCreatorInvite(creatorName, clearInviteCreatorItem = null) {
    try {
      //请求参数处理
      let bodyJson = {
        query: creatorName,
        size: 20,
        offset: 0,
        hasMore: false,
      };

      let url = `${appData.GetDomain()}api/v1/oec/affiliate/seller/invitation_group/search/creator${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      let res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      }, bootScript.pageCreateInvite
      );

      var isOk = false;
      if (res.code == 0 && res.message == "success" && res.data != null && res.data.total > 0) {
        res.data.creators.forEach((item) => {
          if (item.user_name == creatorName) {
            isOk = true;
          }
          if (clearInviteCreatorItem != null) {
            clearInviteCreatorItem.base_info.creator_id = item.creator_oec_id;
            clearInviteCreatorItem.base_info.creator_oec_id = item.creator_oec_id;
            clearInviteCreatorItem.base_info.user_name = item.user_name;
          }
        });
        return isOk;
      }
    } catch (ex) { }
    return false;
  },
  /**
   * 验证达人和商品重复邀约 暂不用 本地校验更好
   * @param {*} creatorIds
   * @param {*} callbackData
   * @param {*} productIds 数组元素是string
   * @returns 返回true可邀约
   */
  async checkInviteTkHistory(creatorIds, callbackData = null, productIds = null) {
    if (callbackData == null) {
      callbackData = {
        ConflictItems: [],
      };
    }
    if (productIds == null) {
      productIds = appData.ExecuteTaskItem.productIds;
    }

    //优先使用本地校验 通过再根据配置决定是否使用tk校验
    var isOk = this.checkInviteHistory(creatorIds, productIds).length == 0;
    if (!isOk) {
      return isOk;
    }
    if (!appData.inviSettingUS.useLocalCheck) {
      //不使用本地的情况使用tk校验
      try {
        var url = rpa.urlStringify(bootScript.inviteCheckConfig.urlInfo);
        var req = bootScript.inviteCheckConfig.reqBody;
        req.invitation.product_list = [];
        productIds.forEach((item) => {
          req.invitation.product_list.push({ product_id: item });
        });
        req.invitation.creator_id_list = [];
        creatorIds.forEach((item) => {
          req.invitation.creator_id_list.push({ base_info: { creator_oec_id: item } });
        });
        var result = await this.fetchJsonAsync(
          url,
          {
            method: "POST",
            headers: bootScript.findCreatorConfig.reqHeader,
            body: JSON.stringify(req),
          },
          bootScript.pageCreateInvite
        );
        if (result && result.code == 0 && result.data != null) {
          if (result.data.conflict_list == null) {
            return true;
          } else {
            //读取冲突商品和达人信息
            if (callbackData != null) {
              callbackData.ConflictItems = await this.parseConflictInvite(result.data);
              console.log("验证冲突达人反馈：", callbackData);
            }
            return false;
          }
        } else {
          console.log("tk校验失败", result);
          // console.log("tk校验失败 休息一会重试", result);
          // await rpa.sleep(1000 * 20);
        }
      } catch { }
    }
    return isOk;
  },
  /**
   * 本地邀约历史校验 只返回冲突的达人id数组 空则通过
   * @param {*} creatorIds 
   * @param {*} productIds 
   * @returns 
   */
  checkInviteHistory(creatorIds, productIds = null) {
    // return [creatorIds[0]]
    if (productIds == null) {
      productIds = appData.ExecuteTaskItem.productIds;
    }
    //校验每个达人
    let result = []
    for (const cId of creatorIds) {
      try {
        //先找出存在达人的计划
        let creatorPlans = appData.inviteHistoryItems.filter((w) => w.createIds.includes(cId));
        for (const plan of creatorPlans) {
          //每个计划中存在商品id
          let havePIds = plan.productIds.filter((w) => productIds.includes(w));
          if (havePIds.length > 0) {
            result.push(cId)
            break
          }
        }
      } catch (ex) {
        console.log("本地邀约校验冲突错误：" + ex);
      }
    }
    return result;
  },

  lastInviteOpResult: null,         //最近一次单人邀约操作数据
  // 批量邀请达人
  async startBatchInvite() {
    if (!appData.ExecuteTaskItem || appData.CurrentUSTalentList.Count() == 0) {
      return false
    }
    await rpa.runMessage(`开始创建邀约…`);
    var creators = appData.CurrentUSTalentList
    let that = this
    //批量邀请成功记录数据
    let inviteOk = async function (opResult) {
      appData.ExecuteTaskItem.executeNum += opResult.okCreators.length;
      await rpa.instructMessage(`邀约进度：${appData.ExecuteTaskItem.executeNum}/${appData.ExecuteTaskItem.executeTargetNum}`);    //更新进度显示
      await rpa.runMessage(`成功邀约${opResult.okCreators.length}个达人 ID：${opResult.inviteId} 进度：${appData.ExecuteTaskItem.executeNum}/${appData.ExecuteTaskItem.executeTargetNum}`);
      //记录已邀约达人和商品
      var invitePlanItem = {
        inviteId: opResult.inviteId,
        endTime: DateTime.LongStampToDateTime(opResult.reqData.invitation_group.end_time),
        shopId: appData.shopId,
        updateTime: DateTime.Now,
        productIds: opResult.reqData.invitation_group.product_list.map(f => f.product_id),
        createIds: opResult.okCreators.map(f => f.creatorId),
      };
      //记录本地
      await dbApi.insUpdInvitePlan(invitePlanItem);

      //检查停止
      if (appData.ExecuteTaskItem.executeNum >= appData.ExecuteTaskItem.executeTargetNum) {
        await rpa.runMessage("邀约人数已达到任务要求 即将停止……");
        await bootScript.stop();
      }
    }
    //单人邀约模式 已操作的达人会自动移除 返回true当前组加满完成
    let singleInvite = async function (creators) {
      try {
        for (const creator of creators) {
          if (appData.executing == 0) {
            break
          }
          //创建单人计划
          if (!that.lastInviteOpResult) {
            opResult = await that.createInvite([creator]);   //单人邀约 如果本组无人成功下一组则按正常模式邀约
            if (opResult.code == 0) {
              that.lastInviteOpResult = opResult
              // that.lastInviteOpResult.okCreators.push(creator)                            //邀约成功已添加过
            }
            continue
          }
          if (that.lastInviteOpResult && that.lastInviteOpResult.code == 0 && that.lastInviteOpResult.inviteId) {
            //创建邀约成功获取详情
            if (!that.lastInviteOpResult.lastInvite) {
              var detail = await that.getInviteDetail(that.lastInviteOpResult.inviteId)
              if (!detail) {
                throw '获取计划详情失败：' + that.lastInviteOpResult.inviteId
              }
              await rpa.runMessage(`创建邀约组成功 ID：${that.lastInviteOpResult.inviteId}`)
              that.lastInviteOpResult.lastInvite = that.getUpdateDetail(detail)                    //获取复制的计划详情 可用于加人保存
            }
            //开始加人尝试保存
            if (that.lastInviteOpResult.lastInvite.creator_id_list.Any((w) => w.base_info.creator_oec_id == creator.creatorId)) {
              continue;
            }
            let newCreator = { base_info: { creator_id: "", nick_name: "", creator_oec_id: creator.creatorId } }
            // let tempInvite = rpa.copyObject(that.lastInviteOpResult.lastInvite)
            // tempInvite.creator_id_list.push(newCreator)
            // if ((await that.updateInvite(tempInvite)).code == 0) {
            if ((await that.creatorsAdd(that.lastInviteOpResult.inviteId, [creator.creatorId])).code == 0) {
              await rpa.runMessage(`邀约成功达人：${creator.creatorName}`)
              that.lastInviteOpResult.okCreators.push(creator)                            //添加到成功达人列表
              that.lastInviteOpResult.lastInvite.creator_id_list.push(newCreator)         //添加成功则加入
              //判断组加满
              if (that.lastInviteOpResult.okCreators.length == creators.length) {
                var detail = await that.getInviteDetail(that.lastInviteOpResult.inviteId)
                that.lastInviteOpResult.lastInvite = that.getUpdateDetail(detail)
                if (that.lastInviteOpResult.okCreators.length != that.lastInviteOpResult.lastInvite.creator_id_list.length) {
                  console.error("发现记录人数与tk组实际人数不相等运行过程可能出现错误")
                }
                inviteOk(that.lastInviteOpResult)
                let okIds = that.lastInviteOpResult.okCreators.map(f => f.creatorId)
                creators.RemoveAll(w => okIds.includes(w.creatorId))                   //移除已邀约成功达人
                that.lastInviteOpResult = null                                         //单人邀约组补满 还原正常模式
                return true
              }
            }
          }
        }
      } catch (error) {
        console.error('单人邀约出错：', error)
      }
      creators.splice(0, creators.length);      //清空邀约组
      return false
    }

    //上一次单人模式邀约未完成继续完成再执行正常模式
    if (this.lastInviteOpResult) {
      return await singleInvite(creators)
    } else {
      // return await singleInvite(creators)          //测试
      //正常模式直接发送邀约
      let opResult = await this.createInvite(creators);
      //成功则直接保存记录
      if (opResult.code == 0) {
        inviteOk(opResult);
        creators.splice(0, creators.length);      //清空邀约组
        return true
      }
      //失败剔除部分达人
      if (opResult.code == 1) {
        await rpa.runMessage(`发现${opResult.conflictIds.length}个达人已邀约 正在过滤达人：`, creators.filter((w) => opResult.conflictIds.includes(w.creatorId)).map((f) => f.creatorName));
        creators.RemoveAll(w => opResult.conflictIds.includes(w.creatorId))
        return false
      }
      //失败可能包含无法校验出的达人情况 使用先单人发送邀请再单个添加保存达人 当前组保存满再用正常模式发
      if (opResult.code == 2) {
        return await singleInvite(creators)
      }
      //其他异常情况检查可能需要停止
      if (opResult == 3) {

      }
      creators.splice(0, creators.length);      //清空邀约组 
      return false
    }
  },
  invitePlanIndex: 1, //计划递增序号
  //返回code=0成功 1冲突达人 2部分达人不可用改用单个添加模式 3其他异常
  async createInvite(creators) {
    let opResult = { code: 3, reqData: null, inviteId: null, okCreators: [], conflictIds: [] };
    let inviteCreatorConfig = appData.inviSettingUS.inviteCreatorConfig;
    var result = {};
    try {
      var url = rpa.urlStringify(inviteCreatorConfig.urlInfo);
      var req = rpa.copyObject(inviteCreatorConfig.reqBody);
      //针对原请求只修改达人信息
      req.invitation_group.name = inviteCreatorConfig.reqBody.invitation_group.name + `_${this.invitePlanIndex}`;
      req.invitation_group.creator_id_list = [];
      for (const item of creators) {
        req.invitation_group.creator_id_list.push({ base_info: { creator_oec_id: item.creatorId } });
      }
      //发送请求
      opResult.reqData = req;
      await rpa.sleep(500);
      result = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: inviteCreatorConfig.reqHeader,
        body: JSON.stringify(req),
      }, bootScript.pageCreateInvite
      );

      if (!result || (await appData.checkShowSlider(result, "发送邀约遇到滑块验证 请等待弹出验证识别（若多次无法通过验证请人工操作）……", true, 23))) {
        //发送失败或者滑块则重试 
        return await this.createInvite(creators);
      }

      if (result.code == 0 && result.data != null) {
        if (result.data.conflict_list == null) {
          opResult.code = 0
          opResult.inviteId = result.data.invitation.id
          opResult.okCreators = rpa.copyObject(creators)
          this.invitePlanIndex++;
        } else {
          opResult.code = 1
          opResult.conflictIds = await this.parseConflictInvite(result.data);
        }
      } else {
        rpa.runMessage(`创建邀约失败 原因：${JSON.stringify(result)}`);
        if (result.message) {
          if (result.message && result.message.Contains("The invitation failed because the creator is linked with a shop account")) {
            await rpa.runMessage("发现部分达人无法邀约 将尝试单人邀约模式……");
            opResult.code = 2
          }
          await this.handleInviteError(result);
        }
      }
    } catch (e) {
      console.error(`创建邀约执行异常 错误信息：${e}`);
    }
    return opResult;
  },
  //添加达人到合作计划一般都是单个添加 返回对象.code=0成功 其他失败
  async creatorsAdd(inviteId, oecIds = []) {
    let opResult = { code: 1, conflictIds: [] };
    try {
      await rpa.sleep(500);
      var url = `${appData.GetDomain()}api/v1/oec/affiliate/seller/invitation_group/creators_add${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var req = {
        group_id: inviteId,
        creator_ids: oecIds,
      };
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });
      // await rpa.runMessage(`添加邀请达人响应：${JSON.stringify(res)}`);
      if (await appData.checkShowSlider(res, "请在 查找达人 页面操作任意达人邀请并在弹窗选择一个合作点击邀请处理滑块验证", true, 23)) {
        return await this.inviteCreatorAdd(inviteId, oecIds);
      }

      if (res && res.code == 0 && res.data != null) {
        if (res.data.success_cnt == oecIds.length) {                       //成功invited_cnt conflict_cnt都是0
          opResult.code = 0;
        } else if (res.data.conflict_list) {
          opResult.code = 2
          opResult.conflictIds = await this.parseConflictInvite(res.data);
        }
      }
    } catch (ex) {
      await rpa.runMessage(`添加邀请达人出错：${ex}`);
    }
    return opResult;
  },
  //邀约错误处理 在建邀约计划和增加达人都会使用
  async handleInviteError(result) {
    try {
      //常见原因 The invitation failed because the creator is linked with a shop account 部分达人与店铺有其他关联 可继续跑
      //invitation contains creator exceed follower limit 粉丝数限制 可继续跑
      //product not belong this shop 商品问题
      //target invitation has sensitive text 发送消息可能包含敏感词
      //invitation end time invalid 邀约有效期需要更新
      //account permission call fail
      // if (result.message == "in sufficient quota to create invitation") {
      //     await rpa.runMessage(`促发店铺建联限制，任务已停止运行`);     //邀约人数达到店铺上线停止
      //     bootScript.stop();
      // }
      if (result.message.Contains("target invitation has unavailable creator or product") || result.message.Contains(result.message.Contains("product not belong this shop"))) {
        await rpa.runMessage("请检查配置商品能否邀约 请修改后再试");
        // await rpa.sleep(1000 * 30);
        bootScript.stop();
      }
      if (result.message.Contains("invalid contact, field SELLER_INVITATION_WHATS_APP, value")) {
        await rpa.runMessage("请检查联系方式是否有非法字符 请修改后再试");
        bootScript.stop();
      }
      if (result.message && result.message.Contains("invitation end time invalid")) {
        await rpa.runMessage(`检测到邀约有效期在当前时间之前 请重新配置邀约有效期再试`); //邀约人数达到店铺上线停止
        bootScript.stop();
      }
      if (result.message && result.message.Contains("reach create max limit")) {
        await rpa.runMessage(`请检查定向合作数是否达到店铺上线 请手动发送或休息一天再试`); //邀约人数达到店铺上线停止
        bootScript.stop();
      }
      if (result.message && result.message.Contains("invitation contains creator exceed follower limit")) {
        await rpa.runMessage(`当前店铺不支持邀约2w粉丝以上达人 请增加筛选条件再试`); //邀约达人有粉丝数限制
        bootScript.stop();
      }
      if (result.message && result.message.Contains("account permission call fail")) {
        await rpa.runMessage(`当前店铺邀约权限不足 请检查本土跨境站点是否授权错误！！！`); //邀约达人有粉丝数限制
        bootScript.stop();
      }
      await rpa.sleep(1000);
    } catch (error) {
      console.error("handleInviteError出错", error);
    }
  },
  uploadInviteDetailIds: [], //本次任务已经更新过的邀约id
  //解析冲突计划返回冲突的达人id 记录冲突的计划详情
  async parseConflictInvite(conflictData, updInviteDetail = true) {
    var conflict_list = conflictData.conflict_list;
    var conflictIds = [];                 //返回冲突的达人id
    var inviteIds = [];                   //当前需要读取的邀约id
    // if (conflictData.conflict_cids) {
    //   for (const idItem of conflictData.conflict_cids) {
    //     for (const cid of idItem.cids) {
    //       if (!conflictIds.includes(cid)) {
    //         conflictIds.push(cid);          //处理冲突达人id
    //       }
    //     }
    //   }
    // }
    conflict_list.forEach((item) => {
      if (!this.uploadInviteDetailIds.includes(item.id)) {
        if (!inviteIds.Contains(item.id)) {
          inviteIds.push(item.id);                                              //处理需要同步的邀约id
        }
      }
      for (const creator of item.creator_id_list) {
        if (!conflictIds.includes(creator.base_info.creator_oec_id)) {
          conflictIds.push(creator.base_info.creator_oec_id);                   //处理冲突达人id
        }
      }
    });
    if (updInviteDetail && inviteIds.length > 0) {
      rpa.runMessage(`邀约遇到相同商品达人冲突 发现${inviteIds.length}个定向合作需要同步请耐心等待……`);
      for (const inviteId of inviteIds) {
        var detail = await this.getInviteDetail(inviteId);
        if (detail) {
          //查询完整计划详情上报 提高后续准确率
          var invitePlanItem = {
            inviteId: detail.id,
            endTime: DateTime.LongStampToDateTime(detail.end_time),
            shopId: appData.shopId,
            updateTime: DateTime.LongStampToDateTime(detail.update_time),
            productIds: detail.product_list.Select((f) => f.product_id).ToList(),
            createIds: detail.creator_id_list.Select((f) => f.base_info.creator_id).ToList(),
          };
          //记录本地
          await dbApi.insUpdInvitePlan(invitePlanItem);
          // appData.inviteHistoryItems.push(invitePlanItem);
          this.uploadInviteDetailIds.push(inviteId)
        }
      }
    }

    return conflictIds;
  },
  //检查有没有加满每组 返回true就是满了
  CheckUSTalentListIsFull() {
    //超过剩余邀约的数量提前发送
    var task = appData.ExecuteTaskItem;
    if (task != null && task.executeTargetNum - task.executeNum <= appData.CurrentUSTalentList.Count()) {
      return true;
    }

    return appData.CurrentUSTalentList.Count() >= appData.inviSettingUS.groupSize;
  },
  //检查产品id有效 返回true有效
  async CheckProductValid(productId) {
    return true;
    try {
      var domain = appData.GetDomain();
      var req = {
        page_size: 20,
        cur_page: 1,
        source: 2,
        search_params: [
          {
            key: 2,
            search_type: 2,
            value: productId,
          },
        ],
      };

      await rpa.sleep(1000);
      var url = `${domain}api/v1/affiliate/product_selection/list?user_language=en-US&aid=6556&app_name=i18n_ecom_alliance&device_id=0&device_platform=web&cookie_enabled=true&screen_width=1920&screen_height=1080&browser_language=en-US&browser_platform=Win32&browser_name=Mozilla&browser_online=true&shop_region=${appData.regionCode}`;
      var result = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });
      console.info("检查产品id有效：", result);

      if (result) {
        if (result.code == 0) {
          if (result.products != null) {
            var infoList = result.products;
            return infoList.Count() > 0 && infoList[0].status == 1;
          } else {
            return false;
          }
        }
      }
    } catch { }

    return true;
  },

  //#endregion

  //#region 自动私信

  //检查能否私信 过滤n天
  inDaysChated(creator) {
    let hisItems = appData.chatHistoryItems.filter(w => w.creatorId == creator.creatorId)
    if (hisItems && hisItems.length > 0) {
      rpa.runMessage(`跳过达人：${creator.creatorName} 上次私信：${hisItems[0].createTime}`);
      return true
    }
    return false
  },
  //私信前初始化达人信息 此方法已无法验证最后消息时间
  async initialChat(creator) {
    if (!appData.ExecuteTaskItem) {
      return false;
    }
    return true;
    // if (appData.chatInviSettingV2.isApiChat) {
    //   return true;
    // }
    try {
      this.conversation_id = null;
      var creatorId = creator.creatorId;
      var domain = appData.GetDomain();

      var postData = {
        users: [{ role: "creator", id: creatorId }],
      };
      const postUrl = `${domain}api/v1/im/shop_creator/shop/conversation/create?shop_region=${appData.regionCode}&oec_region=${appData.regionCode}&oec_seller_id=${appData.shopId}&user_language=en-US&aid=6556&app_name=i18n_ecom_alliance&device_id=0&device_platform=web&cookie_enabled=true&screen_width=1920&screen_height=1080`;
      await rpa.sleep(500);
      var result = await this.fetchJsonAsync(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });
      //极速私信不用tk的验证
      if (result && result.data) {
        this.conversation_id = result.data.conversation_id;
        return true;
      } else {
        rpa.runMessage("初始化私信过程失败 请尝试手动能否发送");
        // bootScript.stop();
        await rpa.sleep(1000 * 60);
      }
    } catch { }
    return false;
  },

  //protobuf方式发私信
  chatConfig: null,
  rootField2Value: 1000000000, //每次增加1
  shopImId: null,
  conversation_id: null,
  //protobuf方式（无界面）发私信
  async protobufChatSend(creatorName) {
    //已沟通和待回复无法实现
    var msgItems = appData.chatInviSettingV2.msgItems;

    var sendSuccessTime = 0;
    var errorMsg = "";
    try {
      //获取配置可多次使用
      if (!this.chatConfig) {
        var chatConfig = await this.getChatConfig();
        if (!chatConfig) {
          await rpa.runMessage("获取达人私信聊天参数失败无法私信 达人：" + creatorName, "错误");
          return false;
        }
        this.chatConfig = chatConfig;
      }
      if (!this.chatConfig.token) {
        await rpa.runMessage("获取达人私信聊天参数失败无法私信 达人：" + creatorName, "错误");
        return false;
      }
      if (!this.shopImId && this.chatConfig.user && this.chatConfig.user.role == 2) {
        this.shopImId = this.chatConfig.user.id;
      }
      if (!this.shopImId || !this.conversation_id) {
        rpa.runMessage(`创建聊天室失败 无法私信 达人：${creatorName} shopImId：${this.shopImId} conversation_id：${this.conversation_id}`);
        errorMsg = "创建聊天室获取达人私信聊天配置失败 无法私信";
        // await rpa.runMessage("获取达人私信聊天参数失败无法私信 达人：" + creatorName, "错误");
        return { sendSuccessTime, errorMsg };
      }

      //变动参数填充
      // this.shopImId = chatShopInfo.im_id;
      // this.conversation_id = createChatConversation.conversation_id;
      this.rootField2Value++;
      var shopId = appData.shopId;
      var sendTime = Date.now().toString(); //毫秒
      // var client_message_id = appData.getUUID();
      var imToken = this.chatConfig.token; //"1v4QrT8Mb68UwyMD61w3uAkJHDbqjkNqsLQI7gOYVRYi0DKYkJ5U9O"
      var rootField2Value = this.rootField2Value; //每个人加1

      // 1. 定义 Protobuf 消息结构（规范命名：SendReq/SendResp）
      const protoContent = `
syntax = "proto3";

package im.tiktok;

message SendReq {
  int32 field1 = 1;
  int64 field2 = 2;
  string field3 = 3;
  string field4 = 4;
  int32 field5 = 5;
  int32 field6 = 6;
  string field7 = 7;
  NestedMessage field8 = 8;
  string field9 = 9;
  EmptyMessage field10 = 10;
  string field11 = 11;
  EmptyMessage field12 = 12;
  EmptyMessage field13 = 13;
  EmptyMessage field14 = 14;
  int32 field16 = 16;
  int32 field18 = 18;
  int32 field20 = 20;
}

message NestedMessage {
  InnerMessage message_100 = 100;
}

message InnerMessage {
  string field1 = 1;
  int32 field2 = 2;
  int64 field3 = 3;
  string field4 = 4;
  repeated KeyValue field5 = 5;
  int32 field6 = 6;
  string field7 = 7;
  string field8 = 8;
  int32 field10 = 10;
  EmptyMessage field14 = 14;
}

message KeyValue {
  string key = 1;
  oneof value {
    string fieldStr = 2;
    int64 fieldInt = 14;
    //bool fieldBool = 15;   // 布尔值 (如 false)
    EmptyMessage fieldEmpty = 16; // 空值 (如 {})
  }
}

message IntValue {
int32 value = 14; // 内部使用字段14
}
message EmptyMessage {} // 空消息占位

// 响应消息结构
message SendResp {
  int32 field1 = 1;
  int64 field2 = 2;
  int32 field3 = 3;
  string field4 = 4;
  int32 field5 = 5;
  NestedResponse field6 = 6;
  string field7 = 7;
  int64 field10 = 10;
  int64 field11 = 11;
}

message NestedResponse {
  ResponseInnerMessage message_100 = 100;
}

message ResponseInnerMessage {
  int64 field1 = 1;
  //EmptyMessage field2 = 2;
  string field2 = 2;
  int32 field3 = 3;
  string field4 = 4;
  int32 field5 = 5;
  string field6 = 6;
}
`;
      // 2. 解析 Protobuf 定义
      const root = protobuf.parse(protoContent).root;
      const SendReq = root.lookupType("im.tiktok.SendReq");
      const SendResp = root.lookupType("im.tiktok.SendResp");

      let that = this;
      //返回0未知原因失败 1发送成功 2没权限可能超5条
      let funcProtobufSend = async function (type, content, imgWidth = 0, imgHeight = 0) {
        try {
          let client_message_id = appData.getUUID();
          let field4Value = "";
          const keyValuePairs = [];
          switch (type) {
            case "text":
              field4Value = content;
              var tempArr = [
                { key: "PIGEON_BIZ_TYPE", str_value: "1" },
                { key: "monitor_send_message_platform", int_value: 99 },
                { key: "monitor_send_message_start_time", str_value: sendTime },
                { key: "sender_role", str_value: "2" },
                { key: "a:user_language", str_value: "zh" },
                { key: "shop_region", str_value: shopId }, //店铺id
                { key: "sender_im_id", str_value: that.shopImId }, //店铺的im_id
                { key: "sender_im_role", str_value: "2" },
                { key: "type", str_value: "text" }, //文本消息
                { key: "original_content", empty_value: {} }, // 空消息
                { key: "s:mentioned_users", empty_value: {} }, // 空消息
                { key: "s:client_message_id", str_value: client_message_id }, //s:client_message_id
                { key: "s:is_stranger", str_value: "false" },
                { key: "s:is_parallel_conv_gray", str_value: "true" }, //s:is_parallel_conv_gray
                { key: "s:is_parallel_user_gray", str_value: "true" },
              ];
              keyValuePairs.push(...tempArr);
              break;
            case "image":
              field4Value = `图片`;
              var tempArr = [
                { key: "PIGEON_BIZ_TYPE", str_value: "1" },
                { key: "monitor_send_message_platform", int_value: 99 },
                { key: "monitor_send_message_start_time", str_value: sendTime },
                { key: "sender_role", str_value: "2" },
                { key: "a:user_language", str_value: "zh" },
                { key: "shop_region", str_value: shopId }, //店铺id
                { key: "sender_im_id", str_value: that.shopImId }, //店铺的im_id
                { key: "sender_im_role", str_value: "2" },
                { key: "type", str_value: "file_image" }, //图片消息

                { key: "imageUrl", str_value: content }, //图片url用在这里上传 api/v1/im/shop_creator/shop/multimedia/image/upload
                { key: "imageHeight", str_value: imgHeight.toString() },
                { key: "imageWidth", str_value: imgWidth.toString() },
                { key: "starling_content_key", str_value: "im_sdk_cell_sent_photo" },
                { key: "s:uuid", str_value: appData.getUUID() },
                { key: "s:mentioned_users", str_value: "" },
                { key: "s:client_message_id", str_value: client_message_id }, //s:client_message_id
                { key: "s:is_parallel_conv_gray", str_value: "true" }, //s:is_parallel_conv_gray
                { key: "s:is_parallel_user_gray", str_value: "true" },
                { key: "s:is_stranger", str_value: "false" },
              ];
              keyValuePairs.push(...tempArr);
              break;
            case "product":
              field4Value = `商品卡片`;
              var tempArr = [
                { key: "PIGEON_BIZ_TYPE", str_value: "1" },
                { key: "monitor_send_message_platform", int_value: 99 },
                { key: "monitor_send_message_start_time", str_value: sendTime },
                { key: "sender_role", str_value: "2" },
                { key: "a:user_language", str_value: "zh" },
                { key: "shop_region", str_value: shopId }, //店铺id
                { key: "sender_im_id", str_value: that.shopImId }, //店铺的im_id
                { key: "sender_im_role", str_value: "2" },
                { key: "type", str_value: "product" }, //商品消息
                { key: "starling_content_key", str_value: "im_creator_message_type_product_card" },
                { key: "productId", str_value: content },
                { key: "s:mentioned_users", str_value: "" },
                { key: "s:client_message_id", str_value: client_message_id }, //s:client_message_id
                { key: "s:sub_scene", str_value: "default" },
                { key: "s:is_stranger", str_value: "false" },
                { key: "s:biz_aid", str_value: "380360" },
                { key: "s:base_scene", str_value: "default" },
                { key: "s:device_platform", str_value: "web" },
                { key: "s:msg_grade", str_value: "normal" },
              ];
              keyValuePairs.push(...tempArr);
              break;
          }
          const nestedMessage = {
            message_100: {
              field1: that.conversation_id, //conversation_id
              field2: 2,
              field3: protobuf.util.Long.fromString(that.conversation_id), // int64 类型
              field4: field4Value,
              field5: keyValuePairs.map((kv) => {
                const item = { key: kv.key };
                if (kv.str_value !== undefined) item.fieldStr = kv.str_value;
                else if (kv.int_value !== undefined) item.fieldInt = kv.int_value;
                else if (kv.empty_value !== undefined) item.fieldEmpty = kv.empty_value;
                // else if (kv.int_value !== undefined) item.fieldInt = { value: kv.int_value };
                // if (kv.str_value !== undefined) item.value = { fieldStr: kv.str_value };
                // if (kv.int_value !== undefined) item.value = { fieldInt: kv.int_value };
                // if (kv.empty_value !== undefined) item.empty_value = {}; // 空消息实例
                return item;
              }),
              field6: 1000,
              field7: "deprecated",
              field8: client_message_id,
              field10: 0,
              field14: {}, // 空消息实例
            },
          };
          //根字段
          let requestMsg = {
            field1: 100,
            field2: rootField2Value,
            field3: "0.0.8-feat-add-cmd-in-error",
            // field4: "EM76ymByLwp6WA3pQYPtMbkeepeoJR9W9riRTECaBcJCiz83IsUKCf",
            field4: imToken,
            field5: 3,
            field6: 0,
            field7: "93229b4:feat/0.0.8-add-cmd-in-error",
            field8: nestedMessage,
            field9: that.shopImId,
            field10: {},
            field11: "web",
            field12: {},
            field13: {},
            field14: {},
            field16: 0,
            field18: 2,
            field20: 0,
            // 空字段（如 field10/12/13/14）无需显式赋值，protobuf 会处理为默认值
          };
          // 构建并序列化请求
          const validationError = SendReq.verify(requestMsg);
          if (validationError) throw new Error(`参数校验失败: ${validationError}`);
          let requestData = SendReq.encode(SendReq.create(requestMsg)).finish();

          if (requestData) {
            await rpa.sleep(500);
            //准备发送请求
            var url = "https://oec-im-tt-sg.tiktokglobalshopv.com/v1/message/send";
            if (appData.regionCode == "US") {
              url = "https://oecim16-normal-useast5.tiktokv.us/v1/message/send";
            } else if (appData.regionCode == "FR") {
              url = "https://oecim16-normal-useast5.tiktokv.fr/v1/message/send"; //仿照美区未测试
            }
            const headers = {
              "Content-Type": "application/x-protobuf",
            };
            const fetchData = {
              method: "POST",
              headers,
              body: Array.from(requestData),
            };
            const responseBuffer = await rpa.callPageRpa(bootScript.pageFindCreator, "fetchAsync", url, JSON.stringify(fetchData), `protobuf`);
            const responseMsg = SendResp.decode(new Uint8Array(responseBuffer));
            const respJson = SendResp.toObject(responseMsg, {
              longs: String, // 长整型转字符串防精度丢失
              enums: String,
              bytes: String,
            });
            //失败发现字段3 5为3 字段6为no permission
            if (respJson.field4 == "OK" && respJson.field6 && respJson.field6.message_100 && respJson.field6.message_100.field3 == 0 && respJson.field6.message_100.field5 == 0) {
              //间隔等待
              let waitSecond = appData.chatInviSettingV2.execSpeed;
              await rpa.sleep(1000 * waitSecond);
              return 1;
            } else if (respJson.field4 == "OK" && respJson.field6 && respJson.field6.message_100 && respJson.field6.message_100.field3 == 3 && respJson.field6.message_100.field5 == 3 && respJson.field6.message_100.field6 == "no permission") {
              return 2; //可能超过最大私信数限制
            }
          } else {
            throw new Error("处理序列化参数条件失败");
          }
        } catch (error) {
          rpa.runMessage("处理私信参数失败：" + error);
        }
        return 0;
      };
      //
      for (var i = 0; i < msgItems.length; i++) {
        var item = msgItems[i];
        var sendR = 0;
        try {
          rpa.runMessage("开始私信 类型：" + item.type + " 达人：" + creatorName);
          switch (item.type) {
            case "image":
              if (item.tkImgInfo && item.tkImgInfo.url) {
                sendR = await funcProtobufSend(item.type, item.tkImgInfo.url, item.tkImgInfo.width, item.tkImgInfo.height);
              }
              break;
            case "text":
              var content = item.content;
              //达人名称占位符
              if (item.content.includes("{{nickName}}")) {
                content = item.content.replace("{{nickName}}", creatorName);
              }
              sendR = await funcProtobufSend(item.type, content);
              break;
            case "product":
              sendR = await funcProtobufSend(item.type, item.content);
              break;
          }
          if (sendR == 0) {
            rpa.runMessage(`达人${creatorName} 发送失败`);
            errorMsg = `达人${creatorName} 私信失败`;
          }
          if (sendR == 1) {
            rpa.runMessage("发送成功");
            errorMsg = `达人${creatorName} 私信成功`;
            sendSuccessTime++;
          }
          if (sendR == 2) {
            rpa.runMessage("发送消息可能超5条");
            errorMsg = `达人${creatorName} 消息超过5条限制`;
            break;
          }
        } catch (error) {
          console.error("发送出错：", error);
        }
      }
    } catch (error) {
      console.error("发送私信失败:", error);
    }
    rpa.runMessage("私信成功数：" + sendSuccessTime);
    return { sendSuccessTime, errorMsg };
  },
  //获取私信配置
  async getChatConfig(tryNumber = 5) {
    try {
      await rpa.sleep(500);
      var url = appData.GetDomain();
      url = `${url}api/v1/im/shop_creator/shop/user/token/get?shop_region=${appData.regionCode}&oec_region=${appData.regionCode}&oec_seller_id=${appData.shopId}`;
      var res = await this.fetchJsonAsync(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // body: JSON.stringify(bodyJson),
      });

      if (res.code == 0 && res.data != null) {
        return res.data;
      }
    } catch (ex) { }
    //重试
    if (tryNumber > 0) {
      tryNumber--;
      return await this.getChatConfig(tryNumber);
    }
    return null;
  },

  /**
   * 批量发私信接口方式
   * @param {*} oec_ids
   * @param {*} msg
   * @param {*} msg_type 1图片消息 2商品卡消息
   * @param {*} errorCreatorIds 发送失败的id
   * @returns
   */
  async MessagesBatchSend(oec_ids, msg, msg_type = 1, errorCreatorIds = null) {
    var apiName = "极速私信";

    try {
      await rpa.sleep(1000);

      //请求参数处理
      var bodyJson = {
        oec_ids,
        msg_type,
        msg,
      };

      var domain = appData.GetDomain();
      var url = `${domain}api/v1/oec/affiliate/crm/im_messages/batch_send${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      console.log(`${apiName}url：${url} 请求参数：${bodyJson.ToJson()}`);
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "user-agent": appData.ChromeUserAgent
        },
        body: JSON.stringify(bodyJson),
      });

      console.log(`${apiName}响应结果：${res.ToJson()}`);
      //极速私信不成功原因 fail_map达人id无效 invalid_products商品id无效 risk_materials是消息包含风险内容 quota_limit等于true是额度不够
      if (res.code == 0 && res.data != null && res.data.quota_limit == false && res.data.invalid_products == null && res.data.risk_materials == null) {
        if (res.data.fail_map != null) {
          var dicFailMap = Object.keys(res.data.fail_map);
          for (let i = 0; i < dicFailMap.length; i++) {
            const key = dicFailMap[i];
            console.log("以下达人发送失败：" + key);
            errorCreatorIds.Add(key);
          }
        }
        return true;
      } else {
        if (res.code == 0 && res.data == null) {
          console.log("遇到滑块请在达人管理操作一次发送私信");
          return false;
        }
        // talentDal.AddExecuteLog({
        //   taskId: appData.ExecuteTaskItem.id,
        //   logType: "错误",
        //   content: `发送失败：${res.message}`,
        // });
      }
    } catch (ex) {
      console.log(`${apiName}出错：` + ex);
    }

    return false;
  },

  //#endregion

  //#region 订单私信


  //#endregion

  //#region 定向合作

  strLastTimeFrame: "",
  lstLastClearInviteItems: [],
  //前端页面拉取计划列表用 groupStatus=1进行中 2即将过期
  async getInviteHisItems(pageIndex = 1, pageSize = 50, groupStatus = 1, startTime = "", endTime = "") {
    try {
      if (startTime && endTime) {
        var resp = {
          invitation_list: [],
          FilterItems: [],
          has_more: false,
          total: 0,
        };

        //检查缓存
        var cacheKey = groupStatus + "_" + startTime + "_" + endTime;
        if (this.strLastTimeFrame != cacheKey) {
          var start = DateTime.Parse(startTime);
          var end = DateTime.Parse(endTime);
          //重新读数据
          var index = 1;
          this.lstLastClearInviteItems.Clear();
          for (var i = 0; i < 10; i++) {
            var over = false;
            var pageList = await this.GetInviteItems(DateTime.Now.AddDays(1), index, 100, groupStatus);
            index++;
            for (let j = 0; j < pageList.invitation_list.length; j++) {
              const item = pageList.invitation_list[j];
              if (!item.UpdateTime) {
                continue;
              }
              if (item.UpdateTime >= start && item.UpdateTime <= end) {
                this.lstLastClearInviteItems.Add(item);
              }
              if (item.UpdateTime < start) {
                //over = true;
                // console.log($"发现记录时间超过开始时间：{item.ToJson()}");
                break;
              }
            }

            if (over) {
              //遇到开始时间范围以外的停止拉取
              break;
            }

            if (pageList == null || pageList.has_more == false) {
              break;
            }
          }

          this.strLastTimeFrame = cacheKey;
        }

        resp.total = this.lstLastClearInviteItems.Count();
        resp.invitation_list.AddRange(this.lstLastClearInviteItems.Skip((pageIndex - 1) * pageSize).Take(pageSize));
        return { result: true, data: resp, message: "操作成功" };
      } else {
        var resp = await this.GetInviteItems(DateTime.Now.AddDays(1), pageIndex, pageSize, groupStatus);
        return { result: true, data: resp, message: "操作成功" };
      }
    } catch (ex) {
      return new { result: true, message: "拉取数据出错：" + ex }();
    }
  },
  /**
   * 获取邀约记录
   * @param {*} updTime 清理时间点 只返回时间点之前的
   * @param {*} pageIndex
   * @param {*} pageSize
   * @param {*} groupStatus 1进行中 2即将过期
   * @returns
   */
  async GetInviteItems(updTime, pageIndex = 1, pageSize = 50, groupStatus = 1) {
    var result = {
      invitation_list: [],
      FilterItems: [],
      has_more: false,
      total: 0,
    };

    try {
      await rpa.sleep(1000);

      //请求参数处理
      var bodyJson = {
        cur_page: pageIndex,
        invitation_group_status: groupStatus,
        page_size: pageSize,
        search_params: {
          filter_accept_status: 3,
          query_items: [],
        },
      };

      // console.log(`拉取邀约记录参数：${bodyJson.ToJson()}`);

      var url = appData.GetDomain();
      url = `${url}api/v1/oec/affiliate/seller/invitation_group/search${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "cookie": "d_ticket=ce6aee7a68b2d771c75e1a43ef05aedfeec97; _m4b_theme_=new; passport_csrf_token=26541b240b97b23fe11f94abda51f4d3; passport_csrf_token_default=26541b240b97b23fe11f94abda51f4d3; uid_tt=2d3a50a0884bcde895d1fa6665a0b45469a315845de0cedd3551b83b1b273371; uid_tt_ss=2d3a50a0884bcde895d1fa6665a0b45469a315845de0cedd3551b83b1b273371; sid_tt=b8e38db53598a79e9af95f58485ab146; sessionid=b8e38db53598a79e9af95f58485ab146; sessionid_ss=b8e38db53598a79e9af95f58485ab146; msToken=-V_jNQ5hDcWrh8vUJQvHp8Fxy-4XKVmIGVbK6cLZkIKH5EhBmQusuxVVEfl3DBdXbMyR1xhO4J_1TDpVwz98uOuHntclurLe9WzLwdV93CBzQr7JK7x6d_8bm9cM8vU0rQKP4w==; odin_tt=a33ba0bc508f8a885413489ffa1927893e7f0c14e4d350f2b5677179a8fc965f741cc0f3bd8eae9393834867c4b60e3d1329513d4ca850cae6f6abc54aabdce6; i18next=zh-CN; s_v_web_id=verify_m7wyqmqd_i1WsvWt5_mgYF_4MJa_8pLi_j3SW7WDrzkYR; sid_guard=b8e38db53598a79e9af95f58485ab146%7C1741242462%7C864000%7CSun%2C+16-Mar-2025+06%3A27%3A42+GMT; sid_ucp_v1=1.0.0-KDFhYzY0NjZjZDNlN2E1NmI5ODI3N2E2MzQ4NDU4MTcyZmE3MzEwY2MKGAiBiJmKu5iktmQQ3oClvgYYnDM4AUDqBxADGgJteSIgYjhlMzhkYjUzNTk4YTc5ZTlhZjk1ZjU4NDg1YWIxNDY; ssid_ucp_v1=1.0.0-KDFhYzY0NjZjZDNlN2E1NmI5ODI3N2E2MzQ4NDU4MTcyZmE3MzEwY2MKGAiBiJmKu5iktmQQ3oClvgYYnDM4AUDqBxADGgJteSIgYjhlMzhkYjUzNTk4YTc5ZTlhZjk1ZjU4NDg1YWIxNDY; user_oec_info=0a53c6a60b1c7e7b275573d20e843cfc90efc22a799edbc317306fad25fc5dc489c6ec9d05c45a19d43c6b551949b34c6215455c2ea36594aa1408998c9364e2d35dc064488ec6dab2a1a49ace233e0abac6e1c2691a490a3c457ce3951761eb647c71f28f120cea019f36dac9359f3b8ef2b0b358b160223478c5aea50a5ded08f93af6e32aeca66d97d64b16ad9c387561d7e66b10ceaceb0d1886d2f6f20d220104fe540d6b; ttwid=1%7CRruymRjqBIS3ywHotm7vQW6I1JCulRXzh5t9kpjdlBA%7C1741327783%7C0bac9ae7c6b2a192060cc658ea0f515d1b0c523b204bff2233d029ae02bd3435; msToken=xdGYN9VqT7X-yg8rXC_R7RzVtIRWTTXCb82UtmDV3-1ZhG21NaLV5kEeem7eZLMTefgmX1hJD71MXOB8v7f3GOEwVspaNooxEIvra131ahhRjF3Cf1TpZ_xFBXBi3_DgRwmnObMoWgJ3rMqFuBvqvI7dWil-"
        },
        body: JSON.stringify(bodyJson),
      });
      if (res.data != null) {
        result = res.data;
        result.FilterItems = [];
        for (let i = 0; i < result.invitation_list.length; i++) {
          const item = result.invitation_list[i];
          if (!item.update_time) {
            console.log(`ID：${item.id} 时间为null`);
            continue;
          }
          item.UpdateTime = DateTime.LongStampToDateTime(item.update_time);
          if (item.UpdateTime > updTime) {
            //console.log($"ID：{item.id} 时间大于设定日期 item：{item.UpdateTime.Value.ToString("yyyy-MM-dd HH:mm:ss")} updTime：{updTime.ToString("yyyy-MM-dd HH:mm:ss")}");
            continue;
          }

          result.FilterItems.Add(item);
        }
      } else {
        console.log(`清理计划 获取邀约记录列表 返回空`);
        return null;
      }
    } catch (ex) {
      console.log("清理计划 获取邀约记录出错：" + ex);
      await rpa.sleep(2000);
    }

    return result;
  },
  /**
   * 获取指定商品邀约记录
   * @param {*} productId 商品id
   * @param {*} pageIndex
   * @param {*} pageSize
   * @param {*} groupStatus 1进行中 2即将过期
   * @returns
   */
  async GetInviteItemsV2(productId = null, pageIndex = 1, pageSize = 50, groupStatus = 1) {
    var result = {
      invitation_list: [],
      FilterItems: [],
      has_more: false,
      total: 0,
    };

    try {
      await rpa.sleep(200);

      var query_items = [];
      if (productId != null) {
        query_items.Add({
          type: 1,
          key: productId,
        });
      }
      //请求参数处理
      var bodyJson = {
        cur_page: pageIndex,
        invitation_group_status: groupStatus,
        page_size: pageSize,
        search_params: {
          filter_accept_status: 3,
          query_items,
        },
      };

      // console.log(`拉取邀约记录参数：${bodyJson.ToJson()}`);
      var url = appData.GetDomain();
      url = `${url}api/v1/oec/affiliate/seller/invitation_group/search${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "cookie": "d_ticket=ce6aee7a68b2d771c75e1a43ef05aedfeec97; _m4b_theme_=new; passport_csrf_token=26541b240b97b23fe11f94abda51f4d3; passport_csrf_token_default=26541b240b97b23fe11f94abda51f4d3; uid_tt=2d3a50a0884bcde895d1fa6665a0b45469a315845de0cedd3551b83b1b273371; uid_tt_ss=2d3a50a0884bcde895d1fa6665a0b45469a315845de0cedd3551b83b1b273371; sid_tt=b8e38db53598a79e9af95f58485ab146; sessionid=b8e38db53598a79e9af95f58485ab146; sessionid_ss=b8e38db53598a79e9af95f58485ab146; msToken=-V_jNQ5hDcWrh8vUJQvHp8Fxy-4XKVmIGVbK6cLZkIKH5EhBmQusuxVVEfl3DBdXbMyR1xhO4J_1TDpVwz98uOuHntclurLe9WzLwdV93CBzQr7JK7x6d_8bm9cM8vU0rQKP4w==; odin_tt=a33ba0bc508f8a885413489ffa1927893e7f0c14e4d350f2b5677179a8fc965f741cc0f3bd8eae9393834867c4b60e3d1329513d4ca850cae6f6abc54aabdce6; i18next=zh-CN; s_v_web_id=verify_m7wyqmqd_i1WsvWt5_mgYF_4MJa_8pLi_j3SW7WDrzkYR; sid_guard=b8e38db53598a79e9af95f58485ab146%7C1741242462%7C864000%7CSun%2C+16-Mar-2025+06%3A27%3A42+GMT; sid_ucp_v1=1.0.0-KDFhYzY0NjZjZDNlN2E1NmI5ODI3N2E2MzQ4NDU4MTcyZmE3MzEwY2MKGAiBiJmKu5iktmQQ3oClvgYYnDM4AUDqBxADGgJteSIgYjhlMzhkYjUzNTk4YTc5ZTlhZjk1ZjU4NDg1YWIxNDY; ssid_ucp_v1=1.0.0-KDFhYzY0NjZjZDNlN2E1NmI5ODI3N2E2MzQ4NDU4MTcyZmE3MzEwY2MKGAiBiJmKu5iktmQQ3oClvgYYnDM4AUDqBxADGgJteSIgYjhlMzhkYjUzNTk4YTc5ZTlhZjk1ZjU4NDg1YWIxNDY; user_oec_info=0a53c6a60b1c7e7b275573d20e843cfc90efc22a799edbc317306fad25fc5dc489c6ec9d05c45a19d43c6b551949b34c6215455c2ea36594aa1408998c9364e2d35dc064488ec6dab2a1a49ace233e0abac6e1c2691a490a3c457ce3951761eb647c71f28f120cea019f36dac9359f3b8ef2b0b358b160223478c5aea50a5ded08f93af6e32aeca66d97d64b16ad9c387561d7e66b10ceaceb0d1886d2f6f20d220104fe540d6b; ttwid=1%7CRruymRjqBIS3ywHotm7vQW6I1JCulRXzh5t9kpjdlBA%7C1741327783%7C0bac9ae7c6b2a192060cc658ea0f515d1b0c523b204bff2233d029ae02bd3435; msToken=xdGYN9VqT7X-yg8rXC_R7RzVtIRWTTXCb82UtmDV3-1ZhG21NaLV5kEeem7eZLMTefgmX1hJD71MXOB8v7f3GOEwVspaNooxEIvra131ahhRjF3Cf1TpZ_xFBXBi3_DgRwmnObMoWgJ3rMqFuBvqvI7dWil-"
        },
        body: JSON.stringify(bodyJson),
      });
      if (res && res.data != null) {
        result = res.data;
        result.FilterItems = [];
        if (res.data.invitation_list) {
          for (let i = 0; i < result.invitation_list.length; i++) {
            const item = result.invitation_list[i];
            result.FilterItems.Add(item);
          }
        }
      } else {
        console.log(`清理计划 获取邀约记录列表 返回空`);
        return null;
      }
    } catch (ex) {
      console.log("清理计划 获取邀约记录出错：" + ex);
      await rpa.sleep(2000);
    }

    return result;
  },
  /**
   * 获取指定商品并存到本地 定向计划达人和商品
   * @param {*} productId
   * @returns
   */
  async getInviteHistory(productId) {
    var pageIndex = 0;
    var groupStatus = 1;
    var isOver = false;

    if (appData.InviteHistoryProductId.Contains(productId)) {
      console.log("跳过已同步商品id：", productId);
      return true;
    }
    try {
      do {
        if (isOver) {
          break;
        }
        pageIndex++;
        var clearInviteResp = await this.GetInviteItemsV2(productId, pageIndex, 100, groupStatus);
        if (!clearInviteResp) {
          console.error("取定向计划列表失败：", clearInviteResp);
        }
        if (!clearInviteResp.has_more) {
          if (groupStatus == 1) {
            // console.log($"类型：{(groupStatus == 1 ? "进行中" : "即将过期")} 已读完");
            groupStatus = 2;
            pageIndex = 0;
          } else {
            isOver = true;
            // console.log($"类型：{(groupStatus == 1 ? "进行中" : "即将过期")} 已读完 本次拉取数据处理完将停止");
          }
        }
        rpa.runMessage("商品：" + productId + " 已有定向计划：" + clearInviteResp.FilterItems.Count());
        await rpa.sleep(1000);
        //获取详情 rpa.sleep(1000);
        if (clearInviteResp.FilterItems.Count() > 0) {
          let readIndex = 0;
          for (var item of clearInviteResp.FilterItems) {
            readIndex++;
            if (appData.executing == 0) {
              break;
            }
            if (!item.creator_cnt || !item.product_cnt) {
              rpa.runMessage("跳过达人数或商品数为空的计划id：" + item.id);
              continue;
            }
            //校验id 商品数 达人数 相同则不同步
            if (appData.inviteHistoryItems.Any((w) => w.inviteId == item.id && w.productIds.length == item.product_cnt && w.createIds.length == item.creator_cnt)) {
              // console.log("跳过已记录计划id：" + item.id);
              continue;
            }
            rpa.runMessage("正在取定向计划详情：" + item.id);
            var detail = await this.getInviteDetail(item.id);
            if (detail == null) {
              rpa.runMessage("获详情失败 跳过");
              continue;
            }

            if (!detail.creator_id_list || !detail.product_list) {
              rpa.runMessage("详情没有达人或商品数据不完整：", detail);
              continue;
            }

            var endTime = null;
            if (item.end_time) {
              endTime = DateTime.LongStampToDateTime(item.end_time).ToString();
            }
            if (detail.end_time) {
              endTime = DateTime.LongStampToDateTime(detail.end_time).ToString();
            }
            if (!endTime) {
              rpa.runMessage("未取到期时间：" + detail);
              continue;
            }

            var invitePlanItem = {
              inviteId: detail.id,
              endTime: DateTime.LongStampToDateTime(endTime),
              shopId: appData.shopId,
              updateTime: DateTime.LongStampToDateTime(etail.update_time),
              productIds: detail.product_list.Select((f) => f.product_id).ToList(),
              createIds: detail.creator_id_list.Select((f) => f.base_info.creator_id).ToList(),
            };
            //记录本地
            await dbApi.insUpdInvitePlan(invitePlanItem);
          }
        }
        if (appData.executing == 0) {
          break;
        }
      } while (true);

      //记录本次运行跳过此商品
      if (!appData.InviteHistoryProductId.Contains(productId)) {
        rpa.runMessage(`商品：${productId} 已同步完计划`);
        appData.InviteHistoryProductId.Add(productId);
      }
    } catch (ex) {
      console.log("获定向计划历史出错：" + ex);
    }

    return true;
  },

  //获取邀约详情
  async getInviteDetail(inviteId, retry = 3) {
    var result = {
      contacts_info: [],
      creator_id_list: [],
      product_list: [],
    };
    try {
      await rpa.sleep(500);
      //object reqJson = null;
      //请求参数处理
      var bodyJson = {
        invitation_group_id: inviteId,
      };
      var url = `${appData.GetDomain()}api/v1/oec/affiliate/seller/invitation_group/detail${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      });
      if (await appData.checkShowSlider(res, "请在 定向合作 点击任意计划详情页检查处理滑块验证", true, 23)) {
        return await this.getInviteDetail(inviteId, retry);
      }
      if (res.data != null) {
        result = res.data.invitation;
        if (!result.creator_id_list) {
          result.creator_id_list = [];
        }
        if (!result.product_list) {
          result.product_list = [];
        }
        return result;
      } else {
        rpa.runMessage(`计划id：${inviteId} 获取计划详情 res.data返回null`);
      }
    } catch (ex) {
      rpa.runMessage(`计划id：${inviteId}  获取计划详情出错： ` + ex);
      await rpa.sleep(2000);
    }

    if (retry > 0) {
      retry--;
      rpa.runMessage(`定向计划获取失败 剩余重试次数：${retry}`);
      await rpa.sleep(2000);
      return await this.getInviteDetail(inviteId, retry);
    }
    return result;
  },
  //更新邀约记录 返回code=0成功 2部分达人冲突 1和3失败
  async updateInvite(invite) {
    let opResult = { code: 1, conflictIds: [] };
    try {
      if (!invite) {
        return opResult;
      }
      //请求参数处理
      var bodyJson = {
        invitation: invite,
      };
      await rpa.sleep(500);
      var url = `${appData.GetDomain()}api/v1/oec/affiliate/seller/invitation_group/update${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      });
      if (await appData.checkShowSlider(res, "请在 定向合作 点击任意计划编辑并点击保存处理滑块验证", true, 23)) {
        return await this.updateInvite(invite);
      }
      if (res.code == 0 && res.message == "success" && res.data) {
        opResult.code = 0    //返回0成功
        if (res.data.conflict_cids || res.data.conflict_list) {
          opResult.code = 2
          opResult.conflictIds = await this.parseConflictInvite(res.data);
        }
        if (res.update_step && res.update_step.add_creator_ids && res.update_step.add_creator_ids.length > 0 && res.update_step.end_time == "") {
          opResult.code = 3; //没返回冲突但没成功
        }
      } else {
        rpa.runMessage("更新邀约记录失败");
      }
    } catch (ex) {
      rpa.runMessage("更新邀约记录出错：" + ex);
      await rpa.sleep(2000);
    }
    return opResult;
  },
  //获取一个可保存的计划详情数据 剔除过多余字段 返回复制的对象
  getUpdateDetail(detail) {
    //如果是详情读取的数据 需要删减
    if (detail.update_time || detail.start_time) {
      delete detail.creator_added_cnt;
      delete detail.creator_cnt;
      delete detail.creator_posted_cnt;
      delete detail.group_type;
      delete detail.product_cnt;
      delete detail.start_time;
      delete detail.theme_file_id;
      delete detail.theme_url;
      delete detail.update_time;
      detail.creator_id_list = detail.creator_id_list.map((f) => ({
        base_info: {
          creator_id: "",
          nick_name: "",
          creator_oec_id: f.base_info.creator_oec_id,
        },
      }));
      detail.product_list = detail.product_list.map(function (f) {
        var item = {
          product_id: f.product_id,
          target_commission: f.target_commission,
        };
        if (f.target_ads_commission) {
          item.target_ads_commission = f.target_ads_commission;
        }
        return item;
      });
    }
    return rpa.copyObject(detail)
  },
  //取消邀约
  async CancelInvite(inviteId) {
    try {
      // await rpa.sleep(500);

      //请求参数处理
      var bodyJson = {
        group_type: 1,
        invitation_group_id: inviteId,
      };
      var url = appData.GetDomain();
      url = `${url}api/v1/oec/affiliate/seller/invitation_group/terminate${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      });
      if (res.code == 0 && res.message == "success") {
        return true;
      }
    } catch (ex) {
      console.log("清理邀约计划 取消邀约出错：" + ex);
    }
    return false;
  },
  //获取定向计划数
  async GetInviteHisNum() {
    try {
      await rpa.sleep(500);

      //请求参数处理
      var bodyJson = {
        search_params: {
          query_items: [],
          filter_accept_status: 3,
        },
        invitation_status: [1, 2, 3, 4],
      };
      var url = appData.GetDomain();
      url = `${url}api/v1/oec/affiliate/seller/invitation_group/count${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      });
      if (res.code == 0 && res.message == "success") {
        console.log("获取定向计划数成功：", res.data);
        return res.data;
      }
    } catch (ex) {
      console.log("获取定向计划数出错：" + ex);
    }
    return null;
  },

  //#endregion

  //#region 样品申请

  //列表tab 已发货达人记录30 输出内容达人记录40 已履约达人记录100fetchVideo需要传true 已取消记录50
  //获取样品申请列表 返回空集合表示结束 null表示读取失败可继续尝试下一页 tab=0全部 10待审核 20待发货 30已发货 40进行中 100已完成 50已取消
  async GetCreatorSampleDetailItems(pageIndex = 1, pageSize = 50, tab = 0, fetchProduct = false, fetchVideo = false) {
    var apiName = "获取样品申请列表";
    var result = {
      items: [],
      hasMore: false,
    };

    try {
      await rpa.sleep(1000);

      //请求参数处理
      var bodyJson = {
        tab: tab,
        cur_page: pageIndex,
        page_size: pageSize,
        search_params: [
          {
            search_key: 1,
            search_type: 2,
            value: "",
          },
        ],
        order_params: [],
      };

      var url = appData.GetDomain();
      url = `${url}api/v1/affiliate/sample/group/list${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      });
      if (res.code == 0) {
        result.hasMore = res.has_more;
        if (res != null && res.agg_info != null) {
          for (const item of res.agg_info) {
            if (!item.apply_deatil || !item.apply_deatil.creator_info) {
              // console.log($"数据不完整跳过：{item.ToString()}");
              continue;
            }

            var entity = {
              tt_uid: item.apply_deatil.creator_info.tt_uid,
              creator_id: item.apply_deatil.creator_info.creator_id,
              name: item.apply_deatil.creator_info.name,
              //粉丝数
              follower_num: item.apply_deatil.creator_info.follower_num,
              //发布率
              fulfillment_rate: item.apply_deatil.creator_info.fulfillment_rate,
              //销量
              gmv: item.apply_deatil.creator_info.gmv,
              //平均播放
              content_video_views: item.apply_deatil.creator_info.content_video_views,

              CreatorSampleApplyItems: [],
              CreatorVideoItems: [],
            };
            if (item.apply_deatil.apply_info) {
              //订单商品及sku
              entity.apply_id = item.apply_deatil.apply_info.apply_id;
              entity.product_id = item.apply_deatil.apply_info.product_id;
              entity.product_title = item.apply_deatil.apply_info.product_title;
              entity.main_order_id = item.apply_deatil.apply_info.main_order_id;
              entity.sku_id = item.apply_deatil.apply_info.sku_id;
              entity.sku_desc = item.apply_deatil.apply_info.sku_desc;
              //佣金
              entity.commission_rate = item.apply_deatil.apply_info.commission_rate;
              //100是完成 可能和tab参数一样 52过期
              entity.curr_status = item.apply_deatil.apply_info.curr_status;
            }
            if (item.apply_group) {
              //审核用到
              entity.group_id = item.apply_group.group_id;
              entity.group_id_type = item.apply_group.group_id_type;
              entity.apply_ids = item.apply_group.apply_ids;
            }

            //取申请商品
            if (fetchProduct && entity.group_id) {
              await rpa.sleep(500);
              var url2 = appData.GetDomain();
              url2 = `${url2}api/v1/affiliate/sample/apply/list?tab=${tab}&aid=4331&group_id=${entity.group_id}&group_type=${entity.group_id_type}&cur_page=1&page_size=100&oec_seller_id=${appData.shopId}&shop_region=${appData.regionCode}`;
              var res2 = await this.fetchJsonAsync(url2, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
                body: null,
              });
              // console.log($"取申请商品：{respStr2}");
              if (res2 && res2.code == 0 && res2.apply_infos != null) {
                for (const info of res2.apply_infos) {
                  entity.CreatorSampleApplyItems.Add({
                    apply_id: info.apply_id,
                    commission_rate: info.commission_rate,
                    expired_in: info.expired_in,
                    product_id: info.product_id,
                    product_title: info.product_title,
                    sku_desc: info.sku_desc,
                    sku_id: info.sku_id,
                    sku_image: info.sku_image,
                  });
                }
              } else {
                console.log("获取达人样品出错:", res3);
              }
            }
            //取视频
            if (fetchVideo && entity.apply_id) {
              await rpa.sleep(500);
              var url3 = appData.GetDomain();
              url3 = `${url3}api/v1/affiliate/sample/performance?apply_id=${entity.apply_id}&content_type=2&size=20&offset=0&screen_width=1920&screen_height=1080&browser_language=zh-CN&browser_platform=Win32&oec_seller_id=${appData.shopId}&shop_region=${appData.regionCode}`;
              var res3 = await this.fetchJsonAsync(url3, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
                body: null,
              });
              // console.log($"取申请商品：{respStr2}");
              if (res3 && res3.code == 0 && res3.data && res3.data.contents != null) {
                entity.CreatorVideoItems.AddRange(res3.data.contents);
              } else {
                console.log("获取达人视频出错:", res3);
              }
            }

            result.items.Add(entity);
          }
        } else {
          console.log(apiName + "读取结束");
        }
      } else {
        console.log(apiName + "读取失败：{respStr}");
      }
    } catch (ex) {
      await rpa.sleep(10000);
    }

    return result;
  },
  //样品审核
  async CreatorSampleAction(group_ids = [], apply_ids = [], group_id_type = 1) {
    try {
      await rpa.sleep(1000);

      //请求参数处理
      var bodyJson = {
        group_ids,
        apply_ids,
        type: 1, //1 同意
        status_type: 10,
        group_id_type: group_id_type,
      };
      var url = appData.GetDomain();
      url = `${url}api/v1/affiliate/sample/group/action${rpa.urlParamStringify(bootScript.lastUrlParam)}`;
      var res = await this.fetchJsonAsync(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyJson),
      });
      console.log("样品审核响应：", res);
      if (res.code == 0) {
        return res;
      }
    } catch (ex) {
      console.log("清理邀约计划 取消邀约出错：" + ex);
    }
    return null;
  },

  //#endregion

  //获取店铺账号信息
  async getAccountInfo(regionCode) {
    var resp = await this.fetchJsonAsync(`${appData.GetDomain()}api/v1/affiliate/account/info?account_type=1&shop_region=${regionCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // body: '{}',
    });
    console.log("获取店铺信息：", resp);
    return resp;
  },



  /**
   * 封装fetch传输json为异步请求
   * @param {*} url 完整url
   * @param {*} data 请求相关数据 包含字段method、headers、body
   * @param {*} respHeader 获取响应头数据 设置要读的key会自动补value
   */
  async fetchJsonAsync(url, data, pageId = -1) {
    if (pageId == -1) {
      pageId = bootScript.pageFindCreator;
    }
    appData.findTKSliderHeader = false            //发送请求前重置
    let resp = await rpa.callPageRpa(pageId, "fetchAsync", url, JSON.stringify(data), `jsonHeader`);
    if (resp) {
      if (resp.header && resp.header['bdturing-verify']) {
        appData.findTKSliderHeader = true         //发现滑块关键标识
        rpa.runMessage('发现滑块关键标识', resp.header)
      }
      return resp.body
    }
    return null
  },
  async callfetchJsonAsync(url, data, respHeader = {}) {
    data = JSON.parse(data);

    return new Promise(async (resolve, reject) => {
      fetch(url, data)
        .then((resp) => {
          //读响应头
          for (const key in respHeader) {
            //检查对象是否包含key不包含继承的字段名
            if (Object.hasOwnProperty.call(respHeader, key)) {
              var keyValue = resp.headers.get(key);
              respHeader[key] = keyValue;
            }
          }

          if (resp.status === 204 || resp.status === 205) {
            return null; // 或者其他你需要的处理
          }

          //有返回body则转换json 或者使用 'text()' 或 'blob()' 等根据返回内容类型的方法
          if (resp.ok) {
            try {
              // console.log("返回resp", resp);
              var json = resp.json();
              return json;
            } catch (error) {
              console.error(`解析响应数据出错 消息：${error} url：${url}`);
            }
          }
          return null;
        })
        .then((data) => {
          //正常返回数据
          // console.log("返回data", data);
          resolve(data);
        })
        .catch((error) => {
          //此方式不抛异常 打印错误返回null继续执行
          console.error(`请求出错 消息：${error} url：${url}`);
          resolve(null);

          //此方式会抛异常不返回数据
          //reject(new Error(`请求出错 消息：${error} url：${url}`));
        });
      // }
    });
  },
};

console.info("tikTokApi加载完成");
