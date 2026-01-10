
import {
  timestampToFormatTime,
  formatTimeToTimestamp
} from '@/utils'

/** 时间格式化 */
export function filterFormatTime(dateTime, format) {
  const timestamp = formatTimeToTimestamp(dateTime)
  if (!format) {
    format = 'YYYY-MM-DD HH:mm:ss'
  }
  if (!timestamp || timestamp === 0) {
    return ''
  }
  return timestampToFormatTime(timestamp, format)
}

/**
 * 时间戳到格式化时间
 * {{item.create_time|filterTimestampToFormatTime('MM-DD dddd')}}
 * @param {*} time
 * @param {*} cFormat
 */
export function filterTimestampToFormatTime(time, cFormat) {
  if (!cFormat) {
    cFormat = 'YYYY-MM-DD HH:mm'
  }
  if (!time || time === 0) {
    return ''
  }
  return timestampToFormatTime(time, cFormat)
}

/** 格式化时间到时间戳 */
export function filterFormatTimeToTimestamp(format) {
  return formatTimeToTimestamp(format)
}

/** 根据id取接口返回数据中对应的name */
export function filterId2Name(vId, idName) {
  // console.log(vId, idName)
  var result = '未知'
  for (let i = 0; i < idName.length; i++) {
    const kv = idName[i]
    if (kv.id === vId) {
      result = kv.name
      break
    }
  }
  return result
}

/** 取指定长度字符串 */
export function filterSubString(str, len) {
  return str.substring(0, len)
}

/** ******************************************以下来源vueadmin*************************************************/

// import parseTime, formatTime and set to filter
export { parseTime, formatTime } from '@/utils'

/**
 * Show plural label if time is plural number
 * @param {number} time
 * @param {string} label
 * @return {string}
 */
function pluralize(time, label) {
  if (time === 1) {
    return time + label
  }
  return time + label + 's'
}

/**
 * @param {number} time
 */
export function timeAgo(time) {
  const between = Date.now() / 1000 - Number(time)
  if (between < 3600) {
    return pluralize(~~(between / 60), ' minute')
  } else if (between < 86400) {
    return pluralize(~~(between / 3600), ' hour')
  } else {
    return pluralize(~~(between / 86400), ' day')
  }
}

/**
 * Number formatting
 * like 10000 => 10k
 * @param {number} num
 * @param {number} digits
 */
export function numberFormatter(num, digits) {
  const si = [
    { value: 1E18, symbol: 'E' },
    { value: 1E15, symbol: 'P' },
    { value: 1E12, symbol: 'T' },
    { value: 1E9, symbol: 'G' },
    { value: 1E6, symbol: 'M' },
    { value: 1E3, symbol: 'k' }
  ]
  for (let i = 0; i < si.length; i++) {
    if (num >= si[i].value) {
      return (num / si[i].value).toFixed(digits).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + si[i].symbol
    }
  }
  return num.toString()
}

/**
 * 10000 => "10,000"
 * @param {number} num
 */
export function toThousandFilter(num) {
  return (+num || 0).toString().replace(/^-?\d+/g, m => m.replace(/(?=(?!\b)(\d{3})+$)/g, ','))
}

/**
 * Upper case first char
 * @param {String} string
 */
export function uppercaseFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

