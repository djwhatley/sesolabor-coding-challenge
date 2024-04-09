"use strict";

const EventEmitter = require('events');
const MinHeap = require('min-heap');

// Print all entries, across all of the *async* sources, in chronological order.

// Improved solution using event emitter
// Further improved using a buffer for each source

const bufferSize = 100;

module.exports = (logSources, printer) => {
  // Use a min heap to keep log sources sorted by date of the next log line to be printed.
  let heap = new MinHeap((l, r) => {
    // Technically, if this condition is hit, we'll be sorting incorrectly. We should avoid inserting any source with an empty buffer into the heap.
    if (l.buffer.length == 0 || r.buffer.length == 0) {
      return 0;
    }
    return l.buffer[0].date - r.buffer[0].date;
  });
  return new Promise((resolve, reject) => {
    // First insert every source into the heap. It might be possible to leverage the buffering code from below here, but I've left this separate for now.
    let promises = [];
    for (const source of logSources) {
      promises.push(new Promise((res, rej) => {
        source.popAsync().then((log) => {
          if (!!log) {
            heap.insert({source: source, buffer: [log]});
          }
          res();
        });
      }));      
    }
    Promise.all(promises).then(() => {
      // Use event emitter to repeatedly fetch next log line.
      let eventEmitter = new EventEmitter();
      
      // Event to print the next line and process the source.
      eventEmitter.on('printNextLogLine', () => {
        if (heap.size == 0) {
          printer.done();
          resolve(console.log("Async sort complete."));
        } else {
          // Get a source and print its next log.
          const next = heap.removeHead();
          const log = next.buffer.shift();
          printer.print(log);
          
          // If the source's buffer is now empty, trigger the buffering routine.
          if (next.buffer.length == 0) {
            // This could probably be improved, but for simplicity we're just getting one log line to start, then triggering the buffering.
            // The reason is that the heap sorting logic will break if we put a source back on the heap with an empty buffer.
            next.source.popAsync().then((nextLog) => {
              if (!!nextLog) {
                next.buffer.push(nextLog);
                heap.insert(next);
              }
              eventEmitter.emit('bufferLogs');
            });              
          } else {
            // Otherwise, just re-insert to the heap and print whichever line is next.
            heap.insert(next);
            eventEmitter.emit('printNextLogLine');
          }
        }
      });

      // Event that tries to get a long line for *every* remaining source at the same time, then add to the buffer.
      eventEmitter.on('bufferLogs', () => {
        let bufferPromises = [];
        // Feels a little janky iterating over the heap internal array, but we need to directly access these objects.
        for (const src of heap.heap) {
          if (!!src && !src.source.drained) {
            // Create a promise for each non-drained source that gets the next log line and pushes onto the source's buffer.
            bufferPromises.push(new Promise((res, rej) => {
              src.source.popAsync().then((log) => {
                if (!!log) {
                  src.buffer.push(log);
                }
                res();
              });
            }));            
          }         
        }        
        // Process all promises together, then call printNextLogLine.
        // Or, if somehow there are no sources left with logs, just call it to finish the process.
        if (bufferPromises.length > 0) {
          Promise.all(bufferPromises).then(() => {
            eventEmitter.emit('printNextLogLine');
          });
        } else {
          eventEmitter.emit('printNextLogLine');
        }
      });

      // Kickstart loop with first event.
      eventEmitter.emit('printNextLogLine');
    });
  });
};

