"""
spaced_rep.py — SM-2 spaced repetition algorithm.
"""


def sm2_update(quality: int, ease_factor: float, interval_days: float, times_correct: int) -> dict:
    """
    SM-2 algorithm update.
    
    Args:
        quality: 0-5 rating (5=perfect, 2=fail)
        ease_factor: current ease factor (starts at 2.5)
        interval_days: current interval in days
        times_correct: number of consecutive correct recalls
    
    Returns:
        dict with new interval, ease_factor, times_correct
    """
    if quality >= 3:
        # Correct recall
        if times_correct == 0:
            new_interval = 1.0
        elif times_correct == 1:
            new_interval = 6.0
        else:
            new_interval = interval_days * ease_factor

        new_times_correct = times_correct + 1
        new_ease = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ease = max(1.3, new_ease)
    else:
        # Failed recall — reset
        new_interval = 1.0
        new_times_correct = 0
        new_ease = max(1.3, ease_factor - 0.2)

    return {
        "interval_days": round(new_interval, 1),
        "ease_factor": round(new_ease, 2),
        "times_correct": new_times_correct,
    }
