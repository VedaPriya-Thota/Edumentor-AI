def analyze_performance(topic_data):
    weak_topics = []

    for topic, stats in topic_data.items():
        total = stats["correct"] + stats["wrong"]

        if total == 0:
            continue

        accuracy = stats["correct"] / total

        if accuracy < 0.6:
            weak_topics.append(topic)

    return weak_topics