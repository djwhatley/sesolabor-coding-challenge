"use strict";

const MinHeap = require('min-heap');

// Print all entries, across all of the *async* sources, in chronological order.

module.exports = (logSources, printer) => {
  return new Promise((resolve, reject) => {
    // Use a min heap to keep log sources sorted by date of the next log line to be printed.
    let heap = new MinHeap((l, r) => {
      return l.nextLog.date - r.nextLog.date;
    });
    // First insert every source into the heap.
    new Promise((res, rej) => {
      let sourcesPopulated = 0;
      for (let i = 0; i < logSources.length; i++) {
        const src = logSources[i];
        src.popAsync().then((log) => {
          if (!!log) {
            heap.insert({source: src, nextLog: log});
          }
          sourcesPopulated++;
          if (sourcesPopulated == logSources.length) {
            res();
          }
        });
      }
    }).then(() => {
      // Then this janky setup to repeatedly look for the next log without blocking.
      // I think this could possibly be avoided using async/await pattern rather than bare Promises.
      (function pollForLog() {
        setTimeout(() => {
          if (heap.size == 0) {
            printer.done();
            resolve(console.log("Async sort complete."));
          } else {
            // Print lines until we run out of sources; when a source is drained, we don't reinsert to the heap.
            const next = heap.removeHead();
            const log = next.nextLog;
            printer.print(log);
            
            // Get next log from the source; if one exists, reinsert source to the heap.
            next.source.popAsync().then((nextLog) => {
              if (!!nextLog) {
                heap.insert({source: next.source, nextLog: nextLog})
              }
              pollForLog();
            });
          }
        }, 0);
      })();

    });
  });
};
