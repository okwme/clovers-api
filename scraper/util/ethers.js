var Promise = require('bluebird');
var ethers = Object.assign(require('ethers'), require('ethers-contracts'));
var config = require('../../shared/config.js');


var ClubTokenArtifacts = require('../../shared/ClubToken.json')

module.exports.address = ClubTokenArtifacts.networks[config.networkId].address

var Interface = ethers.Interface;
// module.exports.iface = new Interface(ClubTokenArtifacts.abi);
module.exports.iface = Interface;
module.exports.abi = ClubTokenArtifacts.abi;

module.exports.arrayify = ethers.utils.arrayify;
module.exports.bigNumberify = ethers.utils.bigNumberify;
module.exports.RLP = ethers.utils.RLP;

var network = ethers.providers.networks.rinkeby;

ethers.apiToken = config.etherscanAPI;
ethers.apiAccessToken = config.infuraAPI;

var infuraProvider = new ethers.providers.InfuraProvider(network);
var etherscanProvider = new ethers.providers.EtherscanProvider(network);
var provider = module.exports.provider = new ethers.providers.FallbackProvider([
    infuraProvider,
    etherscanProvider
]);


module.exports.ClubToken = ClubToken = new ethers.Contract(ClubTokenArtifacts.networks[config.networkId].address, ClubTokenArtifacts.abi, provider);

module.exports.genesisBlock = config.genesisBlock;

module.exports.logTypes = [ClubToken.interface.events.newUserName(), ClubToken.interface.events.newCloverName(), ClubToken.interface.events.Registered()]
