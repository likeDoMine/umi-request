/**
 * lamia
 * 前后缀拦截
 * @param {*} url: 请求地址
 * @param {*} options: 对应的参数
 */
const addfix = (url, options = {}) => {
  /**
   * prefix：前缀
   * suffix：后缀
   */
  const { prefix, suffix } = options;
  if (prefix) {
    url = `${prefix}${url}`;
  }
  if (suffix) {
    url = `${url}${suffix}`;
  }
  return {
    url,
    options,
  };
};

export default addfix;
