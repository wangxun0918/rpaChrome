var dbApi = {

  //记录或更新邀约历史
  async insUpdInvitePlan(invitePlanItem) {
    try {
      //添加或更新到缓存
      if (!appData.inviteHistoryItems.Any(f => f.inviteId == invitePlanItem.inviteId)) {
        appData.inviteHistoryItems.Add(invitePlanItem);
      }
      else {
        appData.inviteHistoryItems.RemoveAll(f => f.inviteId == invitePlanItem.inviteId);
        appData.inviteHistoryItems.Add(invitePlanItem);
      }

      var dbObj = {
        inviteId: invitePlanItem.inviteId,
        shopId: invitePlanItem.shopId,
        endTime: invitePlanItem.endTime.toISOString(),
        updateTime: invitePlanItem.updateTime.toISOString(),
        jsonProducts: JSON.stringify(invitePlanItem.productIds),
        jsonCreators: JSON.stringify(invitePlanItem.createIds)
      };
      // var inviteNum = await rpa.sqlExecuteScalar(`Select Count(*) from tkInvitePlan where inviteId=@inviteId`, { inviteId: invitePlanItem.inviteId });
      var inviteNum = await rpa.tableQuery('tkInvitePlan', { inviteId: invitePlanItem.inviteId }, 'Count(*)', null, true);
      if (inviteNum != null && parseInt(inviteNum) == 0) {
        //var sql = `INSERT INTO tkInvitePlan (inviteId, shopId, endTime, updateTime, jsonCreators, jsonProducts)
        //                VALUES (@inviteId, @shopId, @endTime, @updateTime, @jsonCreators, @jsonProducts)`;
        //var insR = await rpa.sqlExecuteNonQuery(sql, dbObj);
        //return insR > 0;
        return await rpa.tableInsert('tkInvitePlan', [dbObj]) > 0;
      } else {
        // var sql = `UPDATE tkInvitePlan SET shopId=@shopId, endTime=@endTime, updateTime=@updateTime, jsonCreators=@jsonCreators, jsonProducts=@jsonProducts WHERE inviteId=@inviteId;`
        // var updR = await rpa.sqlExecuteNonQuery(sql, dbObj);
        // return updR > 0;
        delete dbObj.inviteId
        return await rpa.tableUpdate('tkInvitePlan', dbObj, { inviteId: invitePlanItem.inviteId }) > 0;
      }

    } catch (ex) {
      rpa.runMessage("记录或更新邀约历史出错：" + ex);
    }
    return false;
  },
  //获取店铺未过期的邀约历史
  async getShopInvitePlan(shopId) {
    try {
      var now = DateTime.Now.toISOString();
      // var sql = `SELECT * FROM tkInvitePlan WHERE shopId = @shopId AND endTime >= @now;`;
      // var dataTableRows = await rpa.sqlQueryDataTable(sql, { shopId, now });
      var dataTableRows = await rpa.tableQuery('tkInvitePlan', { shopId: shopId, endTime: { op: '>=', value: now } }, '*');
      var plans = [];
      for (const item of dataTableRows) {
        plans.push({
          inviteId: item.inviteId,
          endTime: item.endTime,
          shopId: item.shopId,
          updateTime: item.updateTime,
          productIds: JSON.parse(item.jsonProducts),
          createIds: JSON.parse(item.jsonCreators),
        });
      }
      appData.inviteHistoryItems = plans;
      await rpa.runMessage("本地已读定向计划数：" + plans.length);
      await rpa.sleep(1000);
      return plans;
    } catch (ex) {
      await rpa.runMessage("获取店铺邀约历史出错：" + ex);
    }
    return [];
  },
  //删除定向计划 参数三四不传就是所有
  async delShopInvitePlan(shopId, productId = null, inviteId = null) {
    try {
      var sql = `DELETE FROM tkInvitePlan WHERE shopId = @shopId`;
      var param = {
        shopId
      };
      if (inviteId) {
        sql += " AND inviteId = @inviteId";
        param.inviteId = inviteId;
      }
      if (productId) {
        sql += " AND jsonProducts LIKE @productId";
        param.productId = `%${productId}%`;
      }
      var delNum = await rpa.sqlExecuteNonQuery(sql, param);
      await rpa.runMessage("已删除定向计划数：" + delNum);
      await rpa.sleep(1000);
      return delNum;
    } catch (ex) {
      await rpa.runMessage("删除定向计划出错：" + ex);
    }
    return 0;
  },
  //记录私信的达人
  async insUpdChatCreator(creator) {
    try {
      // var dbObj = rpa.copyObject(creator);
      // var paramSt = 'creatorId,creatorName,shopId,regionCode';
      // if (typeof dbObj.categorys == 'undefined') {
      //   dbObj.categorys = null;
      // }
      // if (typeof dbObj.fansNum == 'undefined') {
      //   dbObj.fansNum = null;
      // }
      // if (typeof dbObj.watchNum == 'undefined') {
      //   dbObj.watchNum = null;
      // }
      // if (typeof dbObj.medGmv == 'undefined') {
      //   dbObj.medGmv = null;
      // }
      // if (typeof dbObj.unitsSold == 'undefined') {
      //   dbObj.unitsSold = null;
      // }
      // if (typeof dbObj.videoEngagement == 'undefined') {
      //   dbObj.videoEngagement = null;
      // }
      // if (typeof dbObj.videoGmv == 'undefined') {
      //   dbObj.videoGmv = null;
      // }
      // if (typeof dbObj.liveGmv == 'undefined') {
      //   dbObj.liveGmv = null;
      // }
      // if (typeof dbObj.chatNum == 'undefined') {
      //   dbObj.chatNum = null;
      // }
      // if (typeof dbObj.createTime == 'undefined') {
      //   dbObj.createTime = null;
      // }
      // var sql = `INSERT INTO tkChatCreator (creatorId,creatorName,shopId,regionCode,categorys,fansNum,watchNum,medGmv,unitsSold,videoEngagement,videoGmv,liveGmv,chatNum,createTime) 
      // VALUES (@creatorId,@creatorName,@shopId,@regionCode,@categorys,@fansNum,@watchNum,@medGmv,@unitsSold,@videoEngagement,@videoGmv,@liveGmv,@chatNum,@createTime)`;
      // var insR = await rpa.sqlExecuteNonQuery(sql, dbObj);
      // return insR > 0;
      let dbObj = {
        creatorId: creator.creatorId,
        creatorName: creator.creatorName,
        shopId: creator.shopId,
        regionCode: creator.regionCode,
        categorys: creator.categorys || null,
        fansNum: creator.fansNum || null,
        watchNum: creator.watchNum || null,
        medGmv: creator.medGmv || null,
        unitsSold: creator.unitsSold || null,
        videoEngagement: creator.videoEngagement || null,
        videoGmv: creator.videoGmv || null,
        liveGmv: creator.liveGmv || null,
        chatNum: creator.chatNum || null,
        createTime: creator.createTime || null
      }
      return await rpa.tableInsert('tkChatCreator', [dbObj]) > 0;
    } catch (ex) {
      await rpa.runMessage("记录或更新私信的达人出错：" + ex);
    }
    return false;
  },
  //获取店铺指定时间私信历史
  async getShopChatHis(shopId, day) {
    try {
      // var now = DateTime.Now.AddDays(day * -1).ToString();
      // var sql = `SELECT creatorId, creatorName, createTime FROM tkChatCreator WHERE shopId = @shopId AND createTime >= @now;`;
      var now = DateTime.Now.AddDays(day * -1).toISOString();
      var dataTableRows = await rpa.tableQuery('tkChatCreator', { shopId, createTime: { op: '>=', value: now } }, '*');
      var items = [];
      for (const item of dataTableRows) {
        items.push({
          creatorId: item.creatorId,
          creatorName: item.creatorName,
          createTime: item.createTime,
        });
      }
      appData.chatHistoryItems = items;
      await rpa.runMessage("本地已读历史私信数：" + items.length);
      await rpa.sleep(1000);
      return items;
    } catch (ex) {
      await rpa.runMessage("本地已读历史私信出错：" + ex);
    }
    return [];
  },

  //记录私信买家的订单
  async insUpdChatOrder(buyerOrder) {
    try {
      var dbObj = {
        orderId: buyerOrder.orderId,
        pigeonUid: buyerOrder.pigeonUid,
        shopId: appData.shopId,
        regionCode: appData.regionCode,
        chatNum: buyerOrder.chatNum,
        urlPc: buyerOrder.urlPc,
        createTime: buyerOrder.createTime
      };
      return await rpa.tableInsert('tkChatOrder', [dbObj]) > 0;
    } catch (ex) {
      await rpa.runMessage("记录私信买家的订单出错：" + ex);
    }
    return false;
  },
  //校验订单买家最近几天是否私信过 返回true表示已私信 false表示未私信
  async checkChatBuyerExist(shopId, pigeonUid, day) {
    try {
      var dayBeforeStr = DateTime.Now.AddDays(day * -1).toISOString();
      var hisTotal = await rpa.tableQuery('tkChatOrder', { shopId, pigeonUid, createTime: { op: '>=', value: dayBeforeStr } }, 'COUNT(*)', null, true);
      if (parseInt(hisTotal) == 0) {
        return false;
      }
    } catch (ex) {
      await rpa.runMessage("检查订单私信历史出错：" + ex);
    }
    return true;
  },


};

console.info("dbApi加载完成");
