// Global requestId returned by requestIdleCallback
let requestIdleId = 0;
let requestAnimationId = 0;
let frozenDurationInMs = 0;

/**
 * @see https://github.com/buildwithflux/log-time-to-next-idle
 */
function logTimeToNextIdle(name, callback, options) {
  if (
    typeof window === "undefined" ||
    !window.requestIdleCallback ||
    !window.requestAnimationFrame
  ) {
    return;
  }

  options = {
    warnOnConcurrent: true,
    frozenSuffix: "_frozen",
    maxTimeInMs: 10000,
    minTimeInMs: 10,
    ...options,
  };

  const startMarkName = `${name}_start`;
  window.performance.mark(startMarkName);

  // setTimeout takes care of the possibilty that the idle callback somehow
  // fires before the interaction effects have started. 10ms should be long
  // enough for any effect to start in a new task.
  setTimeout(() => {
    // Cancel existing requests to keep to model of single user input, single UI response
    if (requestIdleId || requestAnimationId) {
      cancelIdleCallback(requestIdleId);
      cancelAnimationFrame(requestAnimationId);
      options.warnOnConcurrent &&
        // eslint-disable-next-line no-console
        console.warn(
          startMarkName + " is displacing an exisiting idle callback"
        );
    }
    requestAnimationId = requestAnimationFrame(() => {
      const measure = window.performance.measure(
        `${name}${options.frozenSuffix}`,
        startMarkName
      );
      // NOTE: FF and Safari don't support
      if (!measure) return;
      frozenDurationInMs = Math.round(measure.duration);
      requestAnimationId = 0;
    });
    requestIdleId = requestIdleCallback(
      ({ didTimeout }) => {
        const endMarkName = `${name}_end`;
        window.performance.mark(endMarkName);
        const measure = window.performance.measure(
          `${name}`,
          startMarkName,
          endMarkName
        );
        // NOTE: FF and Safari don't support
        if (!measure) return;
        const durationInMs = Math.round(measure.duration);

        if (callback) {
          callback(name, {
            durationInMs,
            frozenDurationInMs,
            didTimeout,
          });
        } else {
          console.info(
            `${name} took ${durationInMs}ms until idle, ${frozenDurationInMs}ms until unfrozen`
          );
        }
        requestIdleId = 0;
      },
      {
        timeout: options.maxTimeInMs,
      }
    );
  }, options.minTimeInMs);
}

exports.logTimeToNextIdle = logTimeToNextIdle;
