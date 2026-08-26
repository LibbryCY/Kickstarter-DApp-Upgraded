// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Kickstarter} from "../src/Kickstarter.sol";

contract KickstarterScript is Script {
    Kickstarter public kickstarter;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        kickstarter = new Kickstarter();

        vm.stopBroadcast();
    }

    function test() public {}
}
