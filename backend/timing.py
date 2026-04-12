import time

class Timer:
    """
    A simple context manager to measure execution time in milliseconds.
    """
    def __init__(self, label: str):
        self.label = label

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.end = time.perf_counter()
        self.elapsed_ms = (self.end - self.start) * 1000
        print(f"⏱️  {self.label}: {self.elapsed_ms:.2f}ms")
