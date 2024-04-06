## Reasoning for Solution
The key piece of information we need when collating the log data together is, which entry comes next chronologically. We have to check every log source, since any of them could have the next entry. A brute-force approach would involve checking the timestamp on the next log entry for *every* source, *every* time we process one entry; if there are *N* total log entries, this would mean a multiplier of *N* to the time complexity.

Instead, I figured that a min heap would be a good data structure to use here. Since we only care about the *next* entry at any given time, a min heap can give us whichever source has the lowest timestamp on its next entry, which lets us tease out the chronological sorting by doing the following steps:

* Populate the heap initially with each log source, and its first message.
* While the heap is not empty, we:
    1. Take a source from the head of heap.
    2. Print the stored log message.
    3. Try to get the next message for that source.
    4. If there is a message, put that source back on the heap with that message. 
* Once the heap is empty, we're done.

## On Performance
Removing the head from the heap is *O(1)*, while inserting to it is *O(log n)*. So, given *N* log sources, with a total *K* log lines between them, the time complexity of the solution should be *O(K log N)*, as we are inserting a source to the heap every time we find a log message to print. Compare to the brute-force solution described above, which would be *O(KN)*.

## Async Notes
I find myself dissatisfied with the speed of the async solution, but I have been unable to identify a fix to improve it further. Given the single-threaded nature of JavaScript, it seems like ultimately all of the random delays added to the log fetching have to be waited out on that single thread. And even if we could do it multi-threaded, e.g. with a worker thread, it's still not clear to me that would yield much gain, because we are still limited by the need to know every log source's next entry. So we would have to wait for these calls to return anyway, before we could pull the next entry from the heap. However, even eliminating that random delay, it takes far longer than the synchronous solution, so there's obviously some aspect of the execution flow here that I am missing.

The way I ended up writing the solution could probably be prettier: due to the tricky nature of writing with bare Promises, I used an function with a `setInterval` of 0 to repeatedly check for the next log line, kind of simulating the behavior of a while loop, without blocking the thread. I originally used `setTimeout` and a function that called itself, but this seemed like a risk for deep recursion in the case of very many log lines. I believe this construction could be avoided using `async` and `await`, which should let a while loop structure work again, and look more like the synchronous solution.

## Regarding the `min-heap` package
Hopefully it is acceptable that I have installed and used this package for the solution. Of course, in a real-world scenario, there would need to be due consideration given before installing a third-party package. As an alternative, we might prefer to have an in-house implementation of a min heap, since this is something that could conceivably be useful in a variety of contexts.