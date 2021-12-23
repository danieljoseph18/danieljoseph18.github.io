//initialisation code
const serverUrl = "https://rt2e8bfxusu2.usemoralis.com:2053/server";
const appId = "g6DobHkxFqYxVodgMDwa4LPLVd1KoUm8XJXG1h6B";
Moralis.start({ serverUrl, appId });
Moralis.initPlugins()
        .then(() => console.log("plugins initialised"));

/* Authentication code */
async function login() {
    let user = Moralis.User.current();
    if (!user) {
      user = await Moralis.authenticate({ signingMessage: "Log in using Moralis" })
        .then(function (user) {
          console.log("logged in user:", user);
          console.log(user.get("ethAddress"));
          getStats();
        })
        .catch(function (error) {
          console(error);
        });
    }
  }
  
async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
}
  
  //initialisation html/code 
  document.getElementById("btn-login").addEventListener('click', login);
  document.getElementById("btn-logout").addEventListener('click', logOut);
  document.getElementById('btn-buy-crypto').addEventListener('click', buyCrypto);
  const $tokenBalanceTBody = document.querySelector('.js-balances');
  const tokenValue = (value, decimals) => (decimals ? value /Math.pow(10, decimals) : value);


async function getStats(){
    const balances = await Moralis.Web3API.account.getTokenBalances();
    $tokenBalanceTBody.innerHTML = balances.map((token, index) => 
        `<tr>
            <td>${index+1}</td>
            <td>${token.symbol}</td>
            <td>${tokenValue(token.balance, token.decimals)}</td>
            <td>
                <button class="js-swap btn btn-success btn-sm" data-symbol="${token.symbol}"
                 data-decimals="${token.decimals}" data-address="${token.token_address}"
                 data-max="${tokenValue(token.balance, token.decimals)}">
                 Swap
                </button>
            </td>
        </tr>`).join('');
    for(let $btn of $tokenBalanceTBody.querySelectorAll('.js-swap')){
        $btn.addEventListener('click', initSwapForm);
    }
    return    
}

const $selectedToken = document.querySelector('.js-from-token');
const $fromAmount = document.querySelector('.js-from-amount');

async function initSwapForm(event){
    event.preventDefault();
    $selectedToken.innerText = event.target.dataset.symbol;
    $selectedToken.dataset.address = event.target.dataset.address;
    $selectedToken.dataset.decimals = event.target.dataset.decimals;
    $selectedToken.dataset.max = event.target.dataset.max;
    $fromAmount.removeAttribute('disabled'); 
    $fromAmount.value = '';
    document.querySelector('.js-submit').removeAttribute('disabled');
    document.querySelector('.js-cancel').removeAttribute('disabled');
    document.querySelector('.js-quote-container').innerHTML = ''; 

}
//quote & cancel
document.querySelector('.js-submit').addEventListener('click', formSubmit);
document.querySelector('.js-cancel').addEventListener('click', formCancel);

async function formSubmit(event){
    event.preventDefault();
    const fromAmount = Number.parseFloat($fromAmount.value);
    const fromMaxValue = Number.parseFloat($selectedToken.dataset.max);
    if(Number.isNaN(fromAmount) || fromAmount > fromMaxValue){
        document.querySelector('.js-amount-error').innerText = 'Invalid Input';
        return
    } else {
        document.querySelector('.js-amount-error').innerText = '';
    }
    const fromDecimals = $selectedToken.dataset.decimals;
    const fromTokenAddress = $selectedToken.dataset.address;
    const [toTokenAddress, toDecimals] = document.querySelector('[name=to-token]').value.split('-');
    
    try {
        //quote
        
        const quote = await Moralis.Plugins.oneInch.quote({
            chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress, // The token you want to swap
            toTokenAddress, // The token you want to receive
            amount: Moralis.Units.Token(fromAmount, fromDecimals).toString(),
        });
        const toAmount = tokenValue(quote.toTokenAmount, toDecimals);
        document.querySelector('.js-container').innerHTML = `
        <p>
        ${fromAmount} ${quote.fromToken.symbol} = ${toAmount} ${quote.toToken.symbol}
        </p>
        <p>Gas Fee: ${quote.estimatedGas}</p> 
        `
          


    } catch(e){
        document.querySelector('.js-quote-container').innerHTML = `
        <p class="error">Conversion unsuccessful</p>
        `;
    }

}

async function formCancel(event){
    event.preventDefault();
    document.querySelector('.js-submit').setAttribute('disabled', '');
    document.querySelector('.js-cancel').setAttribute('disabled', '');
    $fromAmount.setAttribute('disabled', ''); 
    $fromAmount.value = '';
    delete $selectedToken.innerText;
    delete $selectedToken.dataset.address;
    delete $selectedToken.dataset.decimals;
    delete $selectedToken.dataset.max;
    document.querySelector('.js-quote-container').innerHTML = ''; 

}

async function buyCrypto(){
    await Moralis.Plugins.fiat.buy();
}

function renderDropdown(tokens){
    const options = tokens.map(token => 
        `
        <option value="${token.address}-${token.decimals}">
            ${token.name}
        </option>
        `
    ).join('');
    document.querySelector('[name=to-token]').innerHTML = options;
}


const coinURL = 'https://api.coinpaprika.com/v1/coins';

const tokenArray = [];
//dynamic functions
async function getCoins(){
    try {
        const response = await fetch(coinURL);
        const coins = await response.json();
        let filtered = await coins.filter(x => x.rank < 31 && x.rank > 0);
        for(let token of filtered){
            tokenArray.push(token.symbol);
        }
        return filtered.map(token => token.symbol);
    } catch(e){
        console.log(e);
    }
}

const tokenURL = "https://api.1inch.exchange/v3.0/1/tokens";

async function getTickers(){
    try {
        const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
            chain: 'polygon',
        });
        const tokenList = await Object.values(tokens.tokens);
        //only 5 return values as only querying the ethereum network
        let filtered = tokenList.filter(x => tokenArray.includes(x.symbol));
        return filtered;
    } catch(e){
        console.log(e);
    }

}

getCoins()
    .then(getTickers)
    .then(renderDropdown);
