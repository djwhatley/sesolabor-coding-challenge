## Reasoning for Solution
The key piece of information we need when collating the log data together is, which entry comes next chronologically. We have to check every log source, since any of them could have the next entry. A brute-force approach would involve checking the timestamp on the next log entry for *every* source, *every* time we process one entry; if there are *N* total log entries, this would mean a multiplier of *N* to the time complexity.

Instead, I figured that a min heap would be a good data structure to use here. Since we only care about the *next* entry at any given time, a min heap can give us whichever source has the lowest timestamp on its next entry, which lets us tease out the chronological sorting by doing the following steps:

* Populate the heap initially with each log source, and its first message.
* While the heap is not empty, we:
    * Take a source from the head of heap.
    * Print the stored log message.
    * Try to get the next message for that source.
    * If there is a message, put that source back on the heap with that message. 
* Once the heap is empty, we're done.

## On Performance
Removing the head from the heap is *O(1)*, while inserting to it is *O(log n)*. So, given *N* log sources, with a total *K* log lines between them, the time complexity of the solution should be *O(K log N)*, as we are inserting a source to the heap every time we find a log message to print. Compare to the brute-force solution described above, which would be *O(KN)*.

## Async Notes
### Initial implementation
On first attempt, I wrote an async solution that seemed quite slow; even eliminating the random delays in `popAsync`, it took much longer than I expected to complete. And it was not very pretty, either: due to the tricky nature of writing with bare Promises, I used an function with a `setInterval` of 0 to repeatedly check for the next log line, kind of simulating the behavior of a while loop, without blocking the thread. I originally used `setTimeout` and a function that called itself, but this seemed like a risk for deep recursion in the case of very many log lines. I would typically have preferred using the async/await pattern, which I think would allow a construction that looks more like the synchronous solution, with a while loop. I have included this first solution in the file `async-sorted-merge-original.js`.

### Event-driven implementation
Over the next day, I kept trying to think of a cleaner way to implement the async solution, and realized an event emitter would do the trick. I created an implementation like this, which was preferable both for code readability / hygeine and the fact that it doesn't do any unnecessary execution like the `setInterval` method. However, this still did not really yield any performance gains, as I was seeing about the same numbers as the original implementation. Testing it without the random delays, I found that it reaches a comparable performance to the synchronous solution, so it is surely somewhat better than the original attempt, but still it is lacking. This implementation can be found in `async-sorted-merge-nobuffers.js`.

### Adding buffers for further improvement
I had also considered an implementation that used buffers for each source, rather than just one message at a time. I wasn't really sure if it would make a difference without being able to take advantage of multiple threads, but Sal prompted me to attempt this implementation, which can now be found in `async-sorted-merge.js`. I believe the key benefit of this approach is that it calls `popAsync` for each source "in parallel," which reduces the overall time spent waiting for the log messages. There are likely further improvements that can be made to it, like buffering more than one message per source at a time. But even as it is, we've gone from about 200 logs per second in the above solutions to now around 5000, using the default value of 100 sources - pushing that higher yields even greater rates, so it clearly is effective to batch these `popAsync` calls across the sources.

Unfortunately, this implementation still threates to exceed the maximum call stack size if the number of sources is pushed too high. I had thought that perhaps using an event emitter would avoid this issue, as the surrounding functions should seem to end, but evidently my understanding of how that works was incorrect. There must be some correct way to achieve that which I am not yet aware of.

## Regarding the `min-heap` package
Hopefully it is acceptable that I have installed and used this package for the solution. Of course, in a real-world scenario, there would need to be due consideration given before installing a third-party package. As an alternative, we might prefer to have an in-house implementation of a min heap, since this is something that could conceivably be useful in a variety of contexts.