"use strict";

const MinHeap = require('min-heap');

// Print all entries, across all of the *async* sources, in chronological order.

// Improved solution using event emitter

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
      // Then this setInterval construction to repeatedly look for the next log without blocking.
      // I think this could possibly be avoided using async/await pattern rather than bare Promises.
      let sourcesWithLogsRemaining = heap.size;
      let ready = true;
      const handle = setInterval(() => {
        if (sourcesWithLogsRemaining == 0) {
          printer.done();
          clearInterval(handle);
          resolve(console.log("Async sort complete."));
        } else if (ready && heap.size > 0) {
          // Print lines until we run out of sources; when a source is drained, we don't reinsert to the heap.
          const next = heap.removeHead();
          const log = next.nextLog;
          printer.print(log);

          // We have to wait for the next log from this source, to know if it is or is not immediately the next one.
          ready = false;          
          // Get next log from the source; if one exists, reinsert source to the heap.
          next.source.popAsync().then((nextLog) => {
            if (!!nextLog) {
              heap.insert({source: next.source, nextLog: nextLog});
            } else {
              sourcesWithLogsRemaining--;
            }
            ready = true;
          });
        }
      }, 0);

    });
  });
};
