X = load('data');
T = load('data2');

X = X(:,2:end);

% 10000 x 51
[m,n] = size(X);

% Feature means
mu = 1/m * sum(X);
Xm = bsxfun(@minus, X, mu);

% Covariance matrix
% 51 x 51
Cov = 1/m * Xm' * Xm;
Cinv = inv(Cov);

% Constant part
pc = (2 * pi) ^ (- n / 2) * det(Cov) ^ (-0.5);

matchid = T(:,1);
T = T(:,3:end);
Tm = bsxfun(@minus, T, mu);

p = pc * exp(-0.5 * sum(bsxfun(@times, Tm * pinv(Cov), Tm), 2))

format long g;
matchid = [matchid(p<1e-90) p(p<1e-90)];

save('abuse.csv', 'matchid');