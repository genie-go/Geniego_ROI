from __future__ import annotations
import random
from typing import Dict

class RLBudgetOptimizer:

    def __init__(self, learning_rate=0.1, discount=0.9, epsilon=0.2):
        self.q_table = {}
        self.lr = learning_rate
        self.discount = discount
        self.epsilon = epsilon

    def _get_q(self, state, action):
        return self.q_table.get((state, action), 0.0)

    def choose_action(self, state, actions):
        if random.random() < self.epsilon:
            return random.choice(actions)
        qs = {a: self._get_q(state, a) for a in actions}
        return max(qs, key=qs.get)

    def update(self, state, action, reward, next_state, actions):
        max_next = max([self._get_q(next_state, a) for a in actions])
        current = self._get_q(state, action)
        new_q = current + self.lr * (reward + self.discount * max_next - current)
        self.q_table[(state, action)] = new_q

def simulate_rl_step(state="stable"):
    actions = ["increase", "decrease", "hold"]
    optimizer = RLBudgetOptimizer()
    action = optimizer.choose_action(state, actions)
    reward = random.uniform(-1, 2)  # simulated performance reward
    optimizer.update(state, action, reward, state, actions)
    return {"action": action, "reward": reward}
