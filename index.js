// Global requestId returned by requestIdleCallback
let requestIdleId = 0;
let requestAnimationId = 0;
let frozenDurationInMs = 0;

/**
 * @see https://github.com/buildwithflux/log-time-to-next-idle
 */
export function logTimeToNextIdle(name, callback, options) {
  if (
    typeof window === "undefined" ||
    !window.requestIdleCallback ||
    !window.requestAnimationFrame
  ) {
    return;
  }

  const startMarkName = `FLUX-PERF:${name}_start`;
  window.performance.mark(startMarkName);

  // setTimeout takes care of the possibilty that the idle callback somehow
  // fires before the interaction effects have started. 10ms should be long
  // enough for any effect to start in a new task.
  setTimeout(() => {
    // Cancel existing requests to keep to model of single user input, single UI response
    if (requestIdleId || requestAnimationId) {
      cancelIdleCallback(requestIdleId);
      cancelAnimationFrame(requestAnimationId);
      // eslint-disable-next-line no-console
      // TODO: parameterize
      console.warn(startMarkName + " is displacing an exisiting idle callback");
    }
    requestAnimationId = requestAnimationFrame(() => {
      const measure = window.performance.measure(
        // TODO: parameterize prefix and suffix
        `${name}_frozen`,
        startMarkName
      );
      // NOTE: FF and Safari don't support
      if (!measure) return;
      frozenDurationInMs = Math.round(measure.duration);
      requestAnimationId = 0;
    });
    requestIdleId = requestIdleCallback(
      ({ didTimeout }) => {
        const endMarkName = `FLUX-PERF:${name}_end`;
        window.performance.mark(endMarkName);
        const measure = window.performance.measure(
          `FLUX-PERF:${name}`,
          startMarkName,
          endMarkName
        );
        // NOTE: FF and Safari don't support
        if (!measure) return;
        const durationInMs = Math.round(measure.duration);

        if (isProductionEnvironment()) {
          // TODO: parameterize as callback
          logEvent(name, {
            durationInMs,
            didTimeout,
            frozenDurationInMs,
          });
        } else {
          // TODO: parameterize as default callback
          console.info(
            `FLUX-PERF: ${name} took ${durationInMs}ms until idle, frozen ${frozenDurationInMs}ms`,
            didTimeout ? " TIMEOUT" : ""
          );
        }
        requestIdleId = 0;
      },
      {
        // 10s timeout so duration is not unbounded and outliers don't
        // mess up the stats.
        // TODO: parameterize
        timeout: 10000,
      }
    );
    // TODO: parameterize
  }, 10);
}
