// #region 兼容CSharp
Array.prototype.Add = function (item) {
  this.push(item);
};
Array.prototype.AddRange = function (items) {
  items.forEach((element) => {
    this.push(element);
  });
};
Array.prototype.Remove = function (item) {
  for (let i = 0; i < this.length; i++) {
    const element = this[i];
    if (element == item) {
      this.splice(i, 1);
      break;
    }
  }
};
/**
 * 移除符合条件的元素 在原数组操作
 * @param {*} predicate 条件
 */
Array.prototype.RemoveAll = function (predicate) {
  var remArr = this.filter(predicate);
  for (let i = 0; i < remArr.length; i++) {
    const remEl = remArr[i];
    for (let j = 0; j < this.length; j++) {
      const element = this[j];
      if (element == remEl) {
        this.splice(j, 1);
        break;
      }
    }
  }
  return this;
};
Array.prototype.RemoveAt = function (index) {
  this.splice(index, 1);
};
Array.prototype.Contains = function (item) {
  return this.includes(item);
};
Array.prototype.Clear = function () {
  this.splice(0, this.length);
};
Array.prototype.Where = function (predicate) {
  return this.filter(predicate);
};
Array.prototype.Any = function (predicate) {
  return this.some(predicate);
};
Array.prototype.Count = function () {
  return this.length;
};
Array.prototype.Take = function (n) {
  return this.slice(0, n);
};
Array.prototype.Skip = function (n) {
  return this.slice(n);
};
//将序列中的每个元素投影到新表单 传入 f=>f.xxx
Array.prototype.Select = function (predicate) {
  return this.map(predicate);
};
//两个数组联合 去除相同的
Array.prototype.Union = function (items) {
  const combinedSet = new Set([...this, ...items]);
  return Array.from(combinedSet);
};
//取第一个元素 
Array.prototype.FirstOrDefault = function () {
  if (this.length == 0) {
    return null;
  }
  return this[0];
};
Array.prototype.ToList = function () {
  return this;
};

//string类型兼容CSharp
String.prototype.ToObject = function () {
  try {
    return JSON.parse(this);
  } catch (e) {
    throw new Error("无法转换对象 字符串：" + this);
  }
};
//字符串替换所有
String.prototype.Replace = function (oldValue, newValue) {
  //或者使用replaceAll
  return this.replace(new RegExp(oldValue, "gm"), newValue);
};
//字符串分割 mode为0包含空字符串 1移除空字符串
String.prototype.Split = function (separator, mode = 1) {
  var result = [];
  var tempArr = this.split(separator);
  if (mode == 1) {
    result = tempArr.filter((w) => !!w);
  } else {
    result = tempArr;
  }
  return result;
};
//字符串包含指定字符串 是否忽略大小写
String.prototype.Contains = function (substring, ignoreCase = false) {
  let str = this;
  if (ignoreCase) {
    str = str.toLowerCase();
    substring = substring.toLowerCase();
  }
  return str.indexOf(substring) !== -1;
};

//任意类型兼容CSharp
Object.prototype.ToString = function () {
  return this.toString();
};
Object.prototype.Trim = function () {
  return this.trim();
};
Object.prototype.ToJson = function () {
  return JSON.stringify(this);
};

//来源https://www.cnblogs.com/kiko2014551511/p/11610943.html
const md5 = {
  rotateLeft: function (lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  },
  addUnsigned: function (lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 0x80000000;
    lY8 = lY & 0x80000000;
    lX4 = lX & 0x40000000;
    lY4 = lY & 0x40000000;
    lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  },
  F: function (x, y, z) {
    return (x & y) | (~x & z);
  },
  G: function (x, y, z) {
    return (x & z) | (y & ~z);
  },
  H: function (x, y, z) {
    return x ^ y ^ z;
  },
  I: function (x, y, z) {
    return y ^ (x | ~z);
  },
  FF: function (a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.F(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  },
  GG: function (a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.G(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  },
  HH: function (a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.H(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  },
  II: function (a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.I(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  },
  convertToWordArray: function (string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWordsTempOne = lMessageLength + 8;
    var lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
    var lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  },
  wordToHex: function (lValue) {
    var WordToHexValue = "",
      WordToHexValueTemp = "",
      lByte,
      lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValueTemp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
    }
    return WordToHexValue;
  },
  uTF8Encode: function (string) {
    string = string.replace(/\x0d\x0a/g, "\x0a");
    var output = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        output += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        output += String.fromCharCode((c >> 6) | 192);
        output += String.fromCharCode((c & 63) | 128);
      } else {
        output += String.fromCharCode((c >> 12) | 224);
        output += String.fromCharCode(((c >> 6) & 63) | 128);
        output += String.fromCharCode((c & 63) | 128);
      }
    }
    return output;
  },

  /**
   * md5 32位加密算法
   * @param {*} string
   * @returns
   */
  encrypt: function (string) {
    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7,
      S12 = 12,
      S13 = 17,
      S14 = 22;
    var S21 = 5,
      S22 = 9,
      S23 = 14,
      S24 = 20;
    var S31 = 4,
      S32 = 11,
      S33 = 16,
      S34 = 23;
    var S41 = 6,
      S42 = 10,
      S43 = 15,
      S44 = 21;
    string = this.uTF8Encode(string);
    x = this.convertToWordArray(string);
    a = 0x67452301;
    b = 0xefcdab89;
    c = 0x98badcfe;
    d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
      AA = a;
      BB = b;
      CC = c;
      DD = d;
      a = this.FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
      d = this.FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
      c = this.FF(c, d, a, b, x[k + 2], S13, 0x242070db);
      b = this.FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
      a = this.FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
      d = this.FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
      c = this.FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
      b = this.FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
      a = this.FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
      d = this.FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
      c = this.FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
      b = this.FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
      a = this.FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
      d = this.FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
      c = this.FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
      b = this.FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
      a = this.GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
      d = this.GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
      c = this.GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
      b = this.GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
      a = this.GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
      d = this.GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = this.GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
      b = this.GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
      a = this.GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
      d = this.GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
      c = this.GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
      b = this.GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
      a = this.GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
      d = this.GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
      c = this.GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
      b = this.GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
      a = this.HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
      d = this.HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
      c = this.HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
      b = this.HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
      a = this.HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
      d = this.HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
      c = this.HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
      b = this.HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
      a = this.HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
      d = this.HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
      c = this.HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
      b = this.HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
      a = this.HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
      d = this.HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
      c = this.HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
      b = this.HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
      a = this.II(a, b, c, d, x[k + 0], S41, 0xf4292244);
      d = this.II(d, a, b, c, x[k + 7], S42, 0x432aff97);
      c = this.II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
      b = this.II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
      a = this.II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
      d = this.II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
      c = this.II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
      b = this.II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
      a = this.II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
      d = this.II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
      c = this.II(c, d, a, b, x[k + 6], S43, 0xa3014314);
      b = this.II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
      a = this.II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
      d = this.II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
      c = this.II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
      b = this.II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
      a = this.addUnsigned(a, AA);
      b = this.addUnsigned(b, BB);
      c = this.addUnsigned(c, CC);
      d = this.addUnsigned(d, DD);
    }
    var tempValue = this.wordToHex(a) + this.wordToHex(b) + this.wordToHex(c) + this.wordToHex(d);
    return tempValue;
  },
};

const Thread = {
  /**
   * 线程睡眠 使用方法: 方法前面要带async变为异步方法 await sleep(200); // 每次等待 200 毫秒
   * @param {any} ms 等待时间 单位毫秒
   * @returns
   */
  Sleep: function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
// #endregion

//时间模拟方法
Date.prototype.ToString = function (format = 'yyyy-MM-dd HH:mm:ss') {
  const year = this.getFullYear();
  const month = String(this.getMonth() + 1).padStart(2, '0');
  const day = String(this.getDate()).padStart(2, '0');
  const hour = String(this.getHours()).padStart(2, '0');
  const minute = String(this.getMinutes()).padStart(2, '0');
  const second = String(this.getSeconds()).padStart(2, '0');

  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
};
Date.prototype.AddDays = function (days) {
  // 获取当前日期对象的时间戳（毫秒数）
  const currentTimestamp = this.getTime();
  // 计算指定天数对应的毫秒数
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const daysInMilliseconds = days * oneDayInMilliseconds;
  // 计算新的时间戳
  const newTimestamp = currentTimestamp + daysInMilliseconds;
  // 使用新的时间戳创建一个新的 Date 对象
  return new Date(newTimestamp);
};
/**
 * 模拟时间静态方法
 */
const DateTime = {
  /**
   * 当前时间
   */
  Now: new Date(),
  /**
  * 字符串转Date
  * @param {*} params 
  */
  NowStamp: function () {
    return Date.now();
  },
  /**
   * 字符串转Date
   * @param {*} params 
   */
  Parse: function (params) {
    return new Date(params);
  },
  /**
   * 毫秒时间戳转换时间
   * @param {*} timeStamp 
   * @returns 
   */
  LongStampToDateTime: function (timeStamp) {
    //new Date(Number("1741314539000"));
    return new Date(Number(timeStamp));
  },
  /**
   * 秒时间戳转换时间
   * @param {*} second 
   * @returns 
   */
  SecondStampToDateTime: function (second) {
    return new Date(Number(second * 1000));
  },

};

console.info("csharpCode加载完成");
