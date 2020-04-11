// 返回一个组合了所有插件的“插件”

export default function compose(middlewares) {
  // 如果middlewares不是数组，则抛出错误
  if (!Array.isArray(middlewares)) throw new TypeError('Middlewares must be an array!');

  // 获取中间件的个数 middlewares.length
  const middlewaresLen = middlewares.length;

  // 遍历验证，middlewares包含的数据，如果不是function，则报错；
  for (let i = 0; i < middlewaresLen; i++) {
    if (typeof middlewares[i] !== 'function') {
      throw new TypeError('Middleware must be componsed of function');
    }
  }

  // 返回一个包裹所有middlewares的一个链式调用方法
  return function wrapMiddlewares(params, next) {
    // 定义一个全局索引，如果执行程序调用是小于全局，就通过reject抛异常
    let index = -1;

    // 定义一个dispatch方法
    function dispatch(i) {
      // 通过reject抛异常
      if (i <= index) {
        return Promise.reject(new Error('next() should not be called multiple times in one middleware!'));
      }
      // 定义index的值
      index = i;

      // 获取下一个中间件。
      const fn = middlewares[i] || next;

      // 如果fn不存在，则返回最终正常的结果
      if (!fn) return Promise.resolve();

      // 采用try， catch的方式返回回掉返回式
      try {
        return Promise.resolve(fn(params, () => dispatch(i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    // 返回放回第一个中间件的结果， 并传入下一个next中间件
    return dispatch(0);
  };
}
