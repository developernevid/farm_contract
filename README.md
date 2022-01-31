# Test task "Farming contract"

Code was written by Andrii Nevidomyi (linkedin: https://www.linkedin.com/in/andrii-nevidomyi-4217b2222/, e-mail: developer.nevid@gmail.com)
 
Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# TODO

1) Add dev-documentation for all of the functions of contract
2) Increase test coverage level to high (~95%)
3) Provide static analysis to identify vulnerabilities
4) Describe business-logic

# Coverage

FarmContract`s test coverage is not completed.
At the moment, it remains to finish coverage of the debt feature and the rest of the non-coverd public functions.

--------------------|----------|----------|----------|----------|----------------|
File                |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------------|----------|----------|----------|----------|----------------|
 contracts\         |    79.59 |    64.29 |    81.25 |       80 |                |
  FarmContract.sol  |    79.17 |    64.29 |    78.57 |    79.59 |... 54,57,58,62 |
  MintableERC20.sol |      100 |      100 |      100 |      100 |                |
--------------------|----------|----------|----------|----------|----------------|
All files           |    79.59 |    64.29 |    81.25 |       80 |                |
--------------------|----------|----------|----------|----------|----------------|

# Performance optimizations

For faster runs of the tests or scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).
