TL;DR: I've found a way to reliably detect abuse matches by applying anomaly detection to game stats.

Introduction
-----
While following a machine learning course I started wondering if what I was learning could be applied
to detecting abuse matches in Dota2. This has been quite a hot topic on here lately, with many people 
lamenting the number of boosters, account-buyers, ... so it seemed worthwhile to do some testing.
If a sufficient number of match statistics would follow a Gaussian distribution, it could theoretically 
be possible to automatically detect outliers by choosing the right cut-off value. As it turns out, 
there *are* a lot of stats that are distributed normally and applying anomaly detection based on 
multivariant gaussian distribution works surprisingly well!

Method
-----
Feel free to skip this section, it's slightly heavy on math.

I collected two non-overlapping sets of matchdetails, each about a `n ≈ 100,000` 10 player matches in size. 
I used the first set of matches as a training set and the second set as the test set to verify results.
For each of those matches, I took the GPM, XPM, kills, deaths and assists for all players on both teams.
Each one of these stats were sorted on size for the winning and for the losing team. The sorted result is 
considered as a feature vector. This way each match is represented by a vector of features, that contains:
```
| Winning team GPM | Losing team GPM  | Winning team XPM | ...
|------------------|------------------|------------------| ...
|Lowest|...|Highest|Lowest|...|Highest|Lowest|...|Highest| ...
|---------------------------------------------------------

```
After combining the feature vectors of the learning set in a giant matrix, I calculated its covariance matrix 
∑ and mean vector μ. These I could then use to create a model based on which can be decided whether or not a match 
is an abuse match. This model looks as follows: p(x) = (2π)^(-n / 2) \* |∑|^(-0.5) \* exp(-0.5 \* (x-μ) \* ∑^(-1) * (x-μ)^T 
where x is a vector representing a feature vector from the test set. Most of this model only needs to be calculated
once and the resulting calculations that need to be run for each tested sample are sufficiently fast to be
able to be calculated in real time. This means you could directly feed the values you receive from the 
GetMatchHistoryBySequenceNum endpoint to this model and have it spit out the suspect matches/players.

Results
-----
By analyzing the p-values obtained by running the model for each one of the feature vectors in the test set, 
it seems that the majority of the matches (about 90%) have a value that lies between 10^(-80) and 10^(-60),
with outliers between 0 and 10^(-100). Based on this I decided to put my cut-off value at 10^(-100) and only
consider games which produced a p-value < 10^(-100). Looking at the games having these values (about 700 samples),
they all fall into the following categories:
* [5 bots stomping 5 other bots](https://www.opendota.com/matches/3043951952)
* [4 bots on each team feeding of the 5th bot on the other team](https://www.opendota.com/matches/3043885716)
* [Excessive feeders of the type "lemme just run down mid"](https://www.opendota.com/matches/3043900942)
* [70+ min games with excessive amounts of kills](https://www.opendota.com/matches/3043854548)
 
The latter two categories all have p-values between 10^(-110) and 10^(-100) so while in theory these could be
filtered out by lowering the cut-off value, this would mean that certain bot matches would slip through. However,
even though these matches only make out the minority of these outliers, I only consider the last category
to be real false negatives. By saving the accounts for each suspect match and looking for multiple occurences,
you can safely assume these last two cases will be eliminated. This would only leave legit bot abuse matches
and persistent feeders. 

Conclusion
-----
By feeding the match details obtained from the web API's history endpoint through this model, it becomes very
easy to detect bot accounts. This proves that even when using a *very* basic machine learning model and very 
little effort, we could make big strides cleaning up bot accounts. Furthermore, these preliminary results suggest
that it would be equally possible to detect certain player behaviour like excessive feeding, by further tweaking
the model. This could potentially automate or complement the reporting system, making it more accurate.

All code used to produce these results can be found on [GitHub](https://github.com/Crazy-Duck/abuse-data).