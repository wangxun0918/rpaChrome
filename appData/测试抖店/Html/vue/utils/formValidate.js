import * as common from '@/utils/common'

/** *************字符窜操作****************** */
// 验证字符窜是不是整数 不包括小数点
export function validStrNumber(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
    }
  } else {
    const r = common.validStrNumber(value)
    if (!r) {
      callback(new Error('请输入数字'))
    }
    callback()
  }
}

// 验证字符窜是不是由字母数字下划线等组成
export function validStrZMX(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
    }
  } else {
    const r = common.validStrNumber(value)
    if (!r) {
      callback(new Error('请输入字母数字或下划线'))
    }
    callback()
  }
}

// 验证字符窜是不是由汉字组成
export function validStrHZ(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
    }
  } else {
    const r = common.validStrHZ(value)
    if (!r) {
      callback(new Error('必须包含汉字'))
    }
    callback()
  }
}

// 验证字符窜是不是邮箱
export function validStrEmail(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
      return
    }
  }
  const r = common.validStrEmail(value)
  if (!r) {
    callback(new Error('邮箱格式不正确'))
  }
  callback()
}

// 验证字符窜是不是电话号码
export function validStrTelphone(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
      return
    }
  }
  const r = common.validStrTelphone(value)
  if (!r) {
    callback(new Error('电话号码格式不正确'))
  }
  callback()
}

// 验证字符窜是不是手机号码
export function validStrMobilephone(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
      return
    }
  }
  const r = common.validStrMobilephone(value)
  if (!r) {
    callback(new Error('手机号格式不正确'))
  }
  callback()
}

// 验证字符窜是不是身份证
export function validStrIdCard(rule, value, callback) {
  if (rule.required) {
    if (!value || value.trim() === '') {
      callback(new Error('不能为空'))
      return
    }
  }
  const r = common.validStrIdCard(value)
  if (!r) {
    callback(new Error('身份证号格式不正确'))
  }
  callback()
}
