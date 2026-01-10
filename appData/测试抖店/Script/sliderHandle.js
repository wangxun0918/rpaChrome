var rpa = window.____rpaName____;
var sliderHandle = {
  //滑块背景图和滑块图筛选器
  imgBackgroundSelect: "#captcha-verify-image",
  imgMoveSlideSelect: ".captcha_verify_img_slide.react-draggable",

  status: 0, //等于1正在操作

  /**
   * 检查滑块出现自动识别
   * @param {*} second
   */
  async checkSlider() {
    console.log("检测滑块验证中……");
    setInterval(async () => {
      if (sliderHandle.status != 0) {
        return;
      }
      var bgImg = document.querySelector(sliderHandle.imgBackgroundSelect);
      var sliderImg = document.querySelector(sliderHandle.imgMoveSlideSelect);
      if (bgImg && sliderImg) {
        try {
          sliderHandle.status = 1;
           await rpa.sleep(2000);
          console.log(`发现滑块正在识别验证……`);
          var result = JSON.parse(await rpa.ocrGapSliderImage(bgImg, sliderImg));
          if (result) {
            if (result.code == 200) {
              //等待验证秒数等于循环次数*每次等待毫秒数
              for (let i = 0; i < 5; i++) {
                console.log(`等待滑块验证通过……`);
                await rpa.sleep(2000);
                if (!document.querySelector(sliderHandle.imgBackgroundSelect) && !document.querySelector(sliderHandle.imgMoveSlideSelect)) {
                  break;
                }
              }
              if (!document.querySelector(sliderHandle.imgBackgroundSelect) && !document.querySelector(sliderHandle.imgMoveSlideSelect)) {
                console.log(`滑块验证通过`);
              }
            } else {
              console.error("处理滑块失败：", result);
            }
          }
        } catch (error) {
          console.error("处理滑块过程出错：", error);
        }
        sliderHandle.status = 0;
      }
    }, 2000);
  },

  //检查是否存在滑块 返回true存在滑块
  async existSlider() {
    if (document.querySelector(".secsdk-captcha-drag-icon")) {
      return true;
    } else {
      if (sliderHandle.status == 1) {
        return true;                    //正在识别处理滑块过程也算存在滑块
      }
      return false;
    }
  },
};
sliderHandle.checkSlider();
