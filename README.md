# log-time-to-next-idle

Measuring the performance of user interactions in the web browser

## Quick Start

```jsx
<Tabs
  onChange={(_event, newValue) => {
    // This is where the magic happens
    logTimeToNextIdle(`switching-to-tab-${newValue}`);
    handleChange(newValue);
    // There is no need to mark the end of the interaction
  }}
>
  <Tab label="Library" />
  <Tab label="Objects" />
</Tabs>
```

_Note: Example code assumes MUI and React_

## Background

I created this package in August 2022 out of a function I wrote for [Flux](https://www.flux.ai/). We've used it to track the performance of around 50 key user interactions over 3 months. We're very happy with how it is working.

## What is a user interaction?

A user interaction is defined here as any input the user provides—mouse click, key press, and so on—coupled with the intended effects of the input—menu opened, element added, and so on. The performance of a user interaction is simply the time between the start of the input to the end of the effects. For example, clicking on a select box will open a menu. The interaction is done when the menu has finished loading.

A subset of the interaction time is defined as “frozen time”. This is the interval following the user input when there are zero screen updates––no animation frames.

## How is a user interaction measured?

Although the concept of a user interaction is easy to define intuitively, the end state can be hard to define formally. In modern reactive UIs, any part of the UI can freely change in response to an update of a store of application state (Redux, Zustand, and so forth). The initial handler of some user input doesn't know all the downstream effects of its execution and so it can't mark the end of the interaction.

To deal with this gap, `log-time-to-next-idle` takes a shortcut. Assuming that...

1. The CPU is idle when there is no user input
2. All effects of a user input happen immediately after the input with the highest priority
3. All effects require CPU time
4. The interaction is done when the CPU returns to idle

...we can leverage [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) to mark when an interaction is done.

Similarly, we can leverage [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) to indicate when an interaction has yielded control back to the main thread, unfreezing the UI.

In short, `log-time-to-next-idle` measures user interactions by queuing a requestAnimationFrame and a requestIdleCallback at the start of an interaction, then recording the time when the callbacks fire.

## Note on concurrency

`log-time-to-next-idle` deals with overlapping interactions by cancelling earlier queued callbacks. In other words, the last interaction "wins" and any previous in-progress interaction is ignored.
