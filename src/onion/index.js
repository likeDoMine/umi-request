// 参考自 puck-core 请求库的插件机制

// 封装一个中间件的聚合，采用promise的方式，组合成链式调用，next的方式一步一步执行
import compose from './compose';

/**
 *
 */
class Onion {
  constructor(defaultMiddlewares) {
    // 传入的默认中间件组合，如果Default middlewares不是数组， 爆出异常
    if (!Array.isArray(defaultMiddlewares)) throw new TypeError('Default middlewares must be an array!');
    // 声明并赋值，defaultMiddlewares
    this.defaultMiddlewares = [...defaultMiddlewares];

    // 定一个middlewares
    this.middlewares = [];
  }

  // 全局中间件
  static globalMiddlewares = [];

  // 内置全局中间件长度
  static defaultGlobalMiddlewaresLength = 0;

  // 内核中间件
  static coreMiddlewares = [];

  // 内置内核中间件长度
  static defaultCoreMiddlewaresLength = 0;

  /**
   * 定义use方法
   * @param {*} newMiddleware
   *
   * @param {*} opts
   * {
   *  global: boolean 全局中间件
   *  core： boolean
   *  defaultInstance: 初始化中间件实例
   * }
   */
  use(newMiddleware, opts = { global: false, core: false, defaultInstance: false }) {
    // 声明core并赋值
    let core = false;

    // 声明global并赋值
    let global = false;

    // 声明初始化中间件实例并赋值
    let defaultInstance = false;

    // 如果opts为number
    if (typeof opts === 'number') {
      // 如果为开发环境，给出错误提示
      if (process && process.env && process.env.NODE_ENV === 'development') {
        console.warn(
          'use() options should be object, number property would be deprecated in future，please update use() options to "{ core: true }".'
        );
      }

      // 设置core
      core = true;

      // 设置global
      global = false;

      // opts === 'object'并且opts存在
    } else if (typeof opts === 'object' && opts) {
      // 设置global
      global = opts.global || false;

      // 设置core
      core = opts.core || false;

      // 设置defaultInstance
      defaultInstance = opts.defaultInstance || false;
    }

    // 全局中间件
    if (global) {
      // 将newMiddleware插入全局中间件
      Onion.globalMiddlewares.splice(
        Onion.globalMiddlewares.length - Onion.defaultGlobalMiddlewaresLength,
        0,
        newMiddleware
      );
      return;
    }
    // 内核中间件
    if (core) {
      // 插入到内核中间件
      Onion.coreMiddlewares.splice(Onion.coreMiddlewares.length - Onion.defaultCoreMiddlewaresLength, 0, newMiddleware);
      return;
    }

    // 默认实例中间件，供开发者使用
    if (defaultInstance) {
      this.defaultMiddlewares.push(newMiddleware);
      return;
    }

    // 实例中间件
    this.middlewares.push(newMiddleware);
  }

  // 执行execute，用于将所有的中间件组合到一起
  execute(params = null) {
    const fn = compose([
      ...this.middlewares,
      ...this.defaultMiddlewares,
      ...Onion.globalMiddlewares,
      ...Onion.coreMiddlewares,
    ]);
    return fn(params);
  }
}

export default Onion;
