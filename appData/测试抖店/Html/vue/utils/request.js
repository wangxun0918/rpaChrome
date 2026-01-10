import axios from 'axios'
import store from '@/store'
import { Message } from 'element-ui'
import { getToken } from '@/utils/auth'
// import { threadSleep } from '@/utils/common'

/** ************************************* axios工具开始 *************************************************/
// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 5000 // request timeout
})
// request interceptor
service.interceptors.request.use(
  config => {
    // do something before request is sent

    if (store.getters.token) {
      // let each request carry token
      // ['X-Token'] is a custom headers key
      // please modify it according to the actual situation
      config.headers['Authorization'] = getToken()
    }
    return config
  },
  error => {
    // do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)
// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
  */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    const res = response.data
    return res
  },
  error => {
    console.log('err' + error) // for debug
    Message({
      message: error.message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)
export default service
/** ************************************* axios工具结束 *************************************************/

/** *************************************以下是应用请求工具*************************************************/
const debug = false

/**
 * json类型异步http请求 优先使用window.fetch不支持时使用XMLHttpRequest
 * @param {*} url http://xxx 接口地址
 * @param {*} data 传送的数据 get类型{xx='yy'}转换为?xx=yy 其他类型转换为json字符串
 * @param {*} method 请求类型 如get
 * @param {*} header 请求头对象 如{uid: 1, token: 'qweqweasdqwe'}
 */
export async function xhrJsonRequest(url = '', data = {}, method = 'GET', header = {}) {
  // 使用XMLHttpRequest传统方法调用接口 resolve和reject相当于两个回调方法
  // 正常运行执行resolve等于返回结果.then((data)=>{})
  // 出现异常执行resolve等于返回结果.catch((data)=>{})
  // https://www.cnblogs.com/mark5/p/11925879.html
  return new Promise((resolve, reject) => {
    // 初始化数据
    method = method.toUpperCase()
    if (!data) {
      data = {}
    }
    if (!header) {
      header = {}
    }

    // 创建xhr
    let xmlReq
    if (window.XMLHttpRequest) {
      xmlReq = new XMLHttpRequest()
    } else {
      // eslint-disable-next-line no-undef
      // xmlReq = new ActiveXObject()
      // 拒绝则会导致程序卡死在此处 异步无限制等待 可用try捕获错误
      reject(new Error('浏览器版本过低不支持XMLHttpRequest，请升级浏览器或使用chrome内核浏览器'))
      return
    }

    // 处理请求参数
    let body = null
    if (method === 'GET') {
      const dataStr = httpGetParamHandle(data)
      url = url + dataStr
      if (debug) {
        console.log('get参数处理完成：' + dataStr)
      }
    } else {
      header['Content-Type'] = 'application/json'
      body = JSON.stringify(data)
      if (debug) {
        console.log('使用window.XMLHttpRequest\nbody参数处理完成：' + body)
      }
    }
    xmlReq.open(method, url, true)
    xmlReq.setRequestHeader('Accept', 'application/json')
    // xmlReq.setRequestHeader('Content-Type', 'application/json') // 使用json格式数据'Cache-Control': ' no-cache'
    // requestObj.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    xmlReq.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    // 添加header
    Object.keys(header).forEach(key => {
      if (header[key]) {
        xmlReq.setRequestHeader(key, header[key])
      }
    })
    if (debug) {
      console.log('请求头处理完成：' + JSON.stringify(header))
    }

    // 发起请求
    xmlReq.send(body)
    xmlReq.onreadystatechange = () => {
      if (xmlReq.readyState === 4) {
        // 请求已响应
        if (xmlReq.status === 0) {
          // 网络不通
          resolve({ code: 400, message: '网络请求失败，请稍候重试', body: null })
          return
        } else if (xmlReq.status === 404) {
          if (debug) {
            console.log('网络请求失败，未找到指定资源')
          }
          resolve({ code: 404, message: '网络请求失败，未找到指定资源', body: null })
          // reject(requestObj)
          return
        } else {
          // 网络畅通 不是404都可能返回数据
          let jsonResp = xmlReq.response
          if (typeof jsonResp !== 'object') {
            jsonResp = JSON.parse(jsonResp)
          }
          resolve(jsonResp)
          return
        }
      }
    }
  })
}

/**
 * 下载文件
 * @param {*} url http://xxx 接口地址
 * @param {*} data 传送的数据 get类型{xx='yy'}转换为?xx=yy 其他类型转换为json字符串
 * @param {*} method 请求类型 如get
 * @param {*} header 请求头对象 如{uid: 1, token: 'qweqweasdqwe'}
 * @param {*} fileName 下载时弹窗文件名 不填默认取后台的
 */
export async function xhrDownloadFile(url = '', data = {}, method = 'GET', header = {}, fileName = null) {
  // 使用XMLHttpRequest传统方法调用接口 https://www.cnblogs.com/mark5/p/11925879.html
  return new Promise((resolve, reject) => {
    // 初始化数据
    method = method.toUpperCase()
    if (!data) {
      data = {}
    }
    if (!header) {
      header = {}
    }

    // data参数处理
    let body = null
    if (method === 'GET') {
      const dataStr = httpGetParamHandle(data)
      url = url + dataStr
      if (debug) {
        console.log('get参数处理完成：' + dataStr)
      }
    } else {
      body = JSON.stringify(data)
      if (debug) {
        console.log('使用window.XMLHttpRequest\nbody参数处理完成：' + body)
      }
    }

    let xmlReq = null
    if (window.XMLHttpRequest) {
      xmlReq = new XMLHttpRequest()
    } else {
      // eslint-disable-next-line no-undef
      // xmlReq = new ActiveXObject()
      // 拒绝则会导致程序卡死在此处 异步无限制等待 可用try捕获错误
      reject(new Error('浏览器版本过低不支持XMLHttpRequest，请升级浏览器或使用chrome内核浏览器'))
      return
    }
    xmlReq.open(method, url, true)
    // xmlReq.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
    // xmlReq.setRequestHeader('Accept', 'application/json')
    // xmlReq.setRequestHeader('Content-Type', 'application/json') // 使用json格式数据'Cache-Control': ' no-cache'
    xmlReq.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

    // 处理header
    Object.keys(header).forEach(key => {
      if (header[key]) {
        xmlReq.setRequestHeader(key, header[key])
      }
    })
    if (debug) {
      console.log('请求头处理完成：' + JSON.stringify(header))
    }

    xmlReq.responseType = 'blob'
    // 发起请求
    xmlReq.send(body)
    xmlReq.onreadystatechange = () => {
      if (xmlReq.readyState === 4) {
        // 请求已响应
        if (xmlReq.status === 200) {
          // 获取文件名
          if (!fileName) {
            // // 使用EAF框架中间件处理后的文件名 中文可能出现乱码
            // fileName = xmlReq.getResponseHeader('File-Download-Name')
            // if (!fileName) {
            //   fileName = 'downloadFile'
            // }
            // 常规方式获取 可能需要根据实际后台更改 此方法在iis下 core3.1可用
            var dispHeader = xmlReq.getResponseHeader('Content-Disposition')
            if (dispHeader.indexOf("filename*=UTF-8''") > 0) {
              fileName = decodeURI(xmlReq.getResponseHeader('Content-Disposition').split("filename*=UTF-8''")[1])
            } else {
              if (debug) {
                console.log('解析后端文件名失败：', dispHeader)
              }
            }
          }
          // console.log(fileName)
          // 开始从响应中下载
          if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            // IE10浏览器开始支持
            window.navigator.msSaveOrOpenBlob(xmlReq.response, fileName)
          } else {
            // 谷歌火狐等浏览器
            if (!window.URL && !window.webkitURL) {
              // 拒绝则会导致程序卡死在此处 异步无限制等待 可用try捕获错误
              reject(new Error('浏览器不支持window.URL，建议使用最新版chrome内核浏览器或ie'))
              return
            }
            // var href = window.URL.createObjectURL(xmlReq.response);
            var href = (window.URL) ? window.URL.createObjectURL(xmlReq.response) : window.webkitURL.createObjectURL(xmlReq.response)
            var link = document.createElement('a')
            link.style.display = 'none'
            link.href = href
            link.setAttribute('download', fileName)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
          // 执行到此应该开始下载了
          resolve({ code: 0, message: '操作成功', body: null })
          return
        } else if (xmlReq.status === 401) {
          resolve({ code: xmlReq.status, message: '请先登录', body: null })
          return
        } else if (xmlReq.status === 403) {
          resolve({ code: xmlReq.status, message: '没有权限执行下载操作', body: null })
          return
        } else if (xmlReq.status === 408) {
          resolve({ code: xmlReq.status, message: '登录状态失效，请刷新页面再重试', body: null })
          return
        } else if (xmlReq.status === 500) {
          resolve({ code: xmlReq.status, message: '服务器处理发生错误', body: null })
          return
        } else if (xmlReq.status === 404) {
          resolve({ code: xmlReq.status, message: '网络请求失败，未找到指定资源', body: null })
          return
        } else {
          // // 拒绝则会导致程序卡死在此处 异步无限制等待 可用try捕获错误
          // reject(new Error('网络请求失败，请稍候重试'))
          // return
          resolve({ code: xmlReq.status, message: '网络请求失败，请稍候重试', body: null })
          return
        }
      }
    }
  })
}

/**
 * 上传文件 需要ie9以上浏览器支持formdata 请求类型为POST
 * @param {*} url 接口完整地址
 * @param {*} formData formData实例 new FormData() 然后使用append添加文件信息
 * @param {*} data url参数 {xx='yy'}转换为?xx=yy
 * @param {*} method 请求类型不可为GET
 * @param {*} header 请求头对象 如{uid: 1, token: 'qweqweasdqwe'}
 * @param {*} proc 上传进度处理方法回调 proc(loaded, total, e){}
 */
export async function xhrUploadFile(url = '', formData = null, urlParam = {}, method = 'POST', header = {}, proc = null) {
  return new Promise((resolve, reject) => {
    // 初始化数据
    if (!formData) {
      reject(new Error('xhrUploadFile方法formData不可为空'))
    }
    method = method.toUpperCase()
    if (method === 'GET') {
      reject(new Error('xhrUploadFile方法method不可为GET'))
    }
    if (!header) {
      header = {}
    }

    let xmlReq
    if (window.XMLHttpRequest) {
      xmlReq = new XMLHttpRequest()
    } else {
      // eslint-disable-next-line no-undef
      // requestObj = new ActiveXObject()
      reject(new Error('您的浏览器版本太低不支持FormData'))
      return
    }

    // 处理url参数
    if (urlParam) {
      const dataStr = httpGetParamHandle(urlParam)
      url = url + dataStr
    }

    xmlReq.open(method, url, true)
    xmlReq.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

    // 处理header
    Object.keys(header).forEach(key => {
      if (header[key]) {
        xmlReq.setRequestHeader(key, header[key])
      }
    })
    if (debug) {
      console.log('请求头处理完成' + url)
    }

    // 进度监听
    xmlReq.upload.addEventListener('progress', (e) => {
      if (debug) {
        console.log('上传进度信息，单位字节')
        console.log(e, e.loaded, e.total) // 可以利用这两个对象算出目前的传输比例
      }
      if (proc) {
        proc(e.loaded, e.total, e)
      }
    }, false)

    // 状态处理
    xmlReq.onreadystatechange = () => {
      if (xmlReq.readyState === 4) {
        // 请求已响应
        if (xmlReq.status === 0) {
          // 网络不通
          resolve({ code: 400, message: '网络请求失败，请稍候重试', body: null })
          return
        } else if (xmlReq.status === 404) {
          if (debug) {
            console.log('网络请求失败，未找到指定资源')
          }
          resolve({ code: 404, message: '网络请求失败，未找到指定资源', body: null })
          return
        } else {
          // 网络畅通 不是404都可能返回数据
          let jsonResp = xmlReq.response
          if (typeof jsonResp !== 'object') {
            jsonResp = JSON.parse(jsonResp)
          }
          resolve(jsonResp)
          return
        }
      }
    }

    // 发送数据
    xmlReq.send(formData)
  })
}

/**
 * http get参数处理 将{id:1,name:'qwer'}转换为?id=1&name=qwer
 * @param {*} data json对象
 */
export function httpGetParamHandle(data) {
  let dataStr = '' // 数据拼接字符串
  Object.keys(data).forEach(key => {
    dataStr += key + '=' + data[key] + '&'
  })

  if (dataStr !== '') {
    dataStr = '?' + dataStr.substr(0, dataStr.lastIndexOf('&'))
  }
  return dataStr
}
