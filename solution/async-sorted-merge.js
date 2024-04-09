"use strict";

const EventEmitter = require('events');
const MinHeap = require('min-heap');

// Print all entries, across all of the *async* sources, in chronological order.

// Improved solution using event emitter

module.exports = (logSources, printer) => {
  // Use a min heap to keep log sources sorted by date of the next log line to be printed.
  let heap = new MinHeap((l, r) => {
    return l.nextLog.date - r.nextLog.date;
  });
  return new Promise((resolve, reject) => {
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
      // Use event emitter to repeatedly fetch next log line.
      let eventEmitter = new EventEmitter();
      eventEmitter.on('printNextLogLine', () => {
        if (heap.size == 0) {
          printer.done();
          resolve(console.log("Async sort complete."));
        } else {
          // Get a source and print its next log.
          const next = heap.removeHead();
          const log = next.nextLog;
          printer.print(log);
          // Get another log from the source; if one exists, reinsert source to the heap.
          next.source.popAsync().then((nextLog) => {
            if (!!nextLog) {
              heap.insert({source: next.source, nextLog: nextLog});
            }
            eventEmitter.emit('printNextLogLine');
          });
        }
      });
      // Kickstart loop with first event.
      eventEmitter.emit('printNextLogLine');
    });
  });
};
