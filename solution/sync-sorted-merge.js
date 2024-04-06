"use strict";

const MinHeap = require('min-heap');

// Print all entries, across all of the sources, in chronological order.

module.exports = (logSources, printer) => {
  // Use a min heap to keep log sources sorted by date of the next log line to be printed.
  let heap = new MinHeap((l, r) => {
    return l.nextLog.date - r.nextLog.date;
  });
  // First insert every source into the heap.
  for (let src of logSources) {
    const log = src.pop();
    if (!!log) {
      heap.insert({source: src, nextLog: log});
    }
  }

  // Print lines until we run out of sources; when a source is drained, we don't reinsert to the heap.
  while(heap.size > 0) {
    const next = heap.removeHead();
    const log = next.nextLog;
    printer.print(log);
    // Get next log from the source; if one exists, reinsert source to the heap.
    const nextLog = next.source.pop();
    if (!!nextLog) {
      heap.insert({source: next.source, nextLog: nextLog})
    }
  }

  printer.done();
  return console.log("Sync sort complete.");
};
