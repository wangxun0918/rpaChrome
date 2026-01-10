
/** *****************字符窜操作********************* */

/**
 * 验证字符窜是不是整数 不包括小数点
 * @param {*} str
 */
export function validStrNumber(str) {
  var reg = /^[0-9]*$/
  if (!str) {
    return true
  }
  return reg.test(str)
}

/**
 * 验证字符窜是不是由字母数字下划线等组成
 * @param {*} str
 */
export function validStrZMX(str) {
  var reg = /^\w+$/
  if (!str) {
    return true
  }
  return reg.test(str)
}

/**
 * 验证字符窜是不是由汉字组成
 * @param {*} str
 */
export function validStrHZ(str) {
  var reg = /[\u4e00-\u9fa5]/
  if (!str) {
    return true
  }
  return reg.test(str)
}

/**
 * 验证电话号码
 * @param {*} str
 */
export function validStrTelphone(str) {
  var reg = /^(\(\d{3,4}\)|\d{3,4}-)?\d{7,8}$/
  if (!str) {
    return true
  }
  return reg.test(str)
}

/**
 * 验证手机号码
 * @param {*} str
 */
export function validStrMobilephone(str) {
  var reg = /^1[3456789]\d{9}$/
  if (!str) {
    return true
  }
  return reg.test(str)
}

/**
 * 验证身份证号码
 * 函数参数必须是字符串，因为二代身份证号码是十八位，而在javascript中，十八位的数值会超出计算范围，造成不精确的结果，导致最后两位和计算的值不一致，从而该函数出现错误。
 * @param {*} idcode 身份证号字符串
 */
export function validStrIdCard(idcode) {
  if (!idcode) {
    return true
  }
  // 加权因子
  var weightFactor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  // 校验码
  var checkCode = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

  var code = idcode + ''
  var last = idcode[17]// 最后一位

  var seventeen = code.substring(0, 17)

  // ISO 7064:1983.MOD 11-2
  // 判断最后一位校验码是否正确
  var arr = seventeen.split('')
  var len = arr.length
  var num = 0
  for (var i = 0; i < len; i++) {
    num = num + arr[i] * weightFactor[i]
  }

  // 获取余数
  var resisue = num % 11
  var lastNo = checkCode[resisue]

  // 格式的正则
  // 正则思路
  /*
  第一位不可能是0
  第二位到第六位可以是0-9
  第七位到第十位是年份，所以七八位为19或者20
  十一位和十二位是月份，这两位是01-12之间的数值
  十三位和十四位是日期，是从01-31之间的数值
  十五，十六，十七都是数字0-9
  十八位可能是数字0-9，也可能是X
  */
  var idcardPatter = /^[1-9][0-9]{5}([1][9][0-9]{2}|[2][0][0|1][0-9])([0][1-9]|[1][0|1|2])([0][1-9]|[1|2][0-9]|[3][0|1])[0-9]{3}([0-9]|[X])$/

  // 判断格式是否正确
  var format = idcardPatter.test(idcode)

  // 返回验证结果，校验码和格式同时正确才算是合法的身份证号码
  return !!(last === lastNo && format)
}

// 验证字符窜是不是邮箱
export function validStrEmail(str) {
  var reg = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/
  if (!str) {
    return true
  }
  return reg.test(str)
}

/**
 * 字符串首字母小写
 * @param {*} str 源字符串
 */
export function toCamel(str) {
  var strTemp = '' // 新字符串
  for (var i = 0; i < str.length; i++) {
    if (i === 0) {
      strTemp += str[i].toLowerCase() // 第一个
      continue
    }
    if (str[i] === ' ' && i < str.length - 1) { // 空格后
      strTemp += ' '
      strTemp += str[i + 1].toLowerCase()
      i++
      continue
    }
    strTemp += str[i]
  }

  return strTemp
}

/** *****************数组操作********************* */

/**
 * 获取元素在数组的下标
 * @param {*} val 元素
 * @returns 返回下标值0到count-1，-1未找到
 */
// eslint-disable-next-line no-extend-native
Array.prototype.indexOf = function(val) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === val)	{
      return i
    }
  }
  return -1
}

/**
 * 根据数组元素删除元素
 * @param {*} val 元素
 */
// eslint-disable-next-line no-extend-native
Array.prototype.remove = function(val) {
  var index = this.indexOf(val)
  if (index > -1) {
    this.splice(index, 1)
  }
}

/**
 * 在数组最前面插入一个元素
 * @param {*} arr 源数组
 * @param {*} obj 要插入的数据
 */
export function pushTop4Array(arr, obj) {
  const result = []
  result.push(obj)
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i])
  }
  return result
}

/**
 * 取数组中对象指定列保存到新数组
 * @param {*} arr 源数组
 * @param {*} col 指定列名
 */
export function getId4ArrayObj(arr, col) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i][col])
  }
  return result
}

/**
 * 数组转字符串以某种字符 如[1,2,3] 转成 1,2,3
 * @param {*} arr 源数组
 * @param {*} spl 分隔符
 * @param {*} remove 是否一处末尾分隔符
 */
export function Array2String(arr, spl, remove) {
  let str = ''
  for (let i = 0; i < arr.length; i++) {
    str += arr[i] + spl
  }
  if (remove) {
    str = str.substr(0, str.length - 1)
  }
  return str
}

/** *****************常用方法********************* */
/**
 * 线程睡眠
 * @param {*} ms 毫秒数
 */
export async function threadSleep(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms)
  })
}

