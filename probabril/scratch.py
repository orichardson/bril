import numpy as np
from matplotlib import pyplot as plt
import pandas as pd
import seaborn as sns

N = 500000
A = np.random.rand(N)
B = np.random.rand(N)
C = np.random.rand(N)
D = np.random.rand(N)

plt.hist( A + B+ C, 20)
sns.kdeplot(A + B *2 + C*5, bw=0.01)
# plt.hist(A+B,40)
# plt.show()

sns.jointplot("A","B", data=A*B)
tips = sns.load_dataset("tips")
sns.get_dataset_names()



# Triangle Distribution
T1 = np.random.triangular(0,1,1, N)
T2 = np.random.triangular(0,1,1, N)

sns.kdeplot(np.sqrt(A), bw=0.01)
# A^{1/2} -1/2 >= 0
sns.kdeplot( C*2 - D**2, bw=0.05)


G1 = np.random.normal(0,1, N)
G2 = np.random.normal(0,1, N)

G1p = [g for g in G1 if g > 0]
G2p = [g for g in G2 if g > 0]

Nsmall =  min(len(G1p), len(G2p))

G1p = np.array(G1p[:Nsmall])
G2p = np.array(G2p[:Nsmall])

sns.kdeplot(G1p + 2 * G2p, bw = 0.001)
