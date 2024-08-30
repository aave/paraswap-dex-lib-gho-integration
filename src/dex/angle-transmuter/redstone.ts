import { DeepReadonly } from 'ts-essentials';
import { PartialEventSubscriber } from '../../composed-event-subscriber';
import {
  Address,
  BlockHeader,
  Log,
  Logger,
  MultiCallInput,
  MultiCallOutput,
} from '../../types';
import { Lens } from '../../lens';
import { Interface } from '@ethersproject/abi';
import ProxyABI from '../../abi/Redstone.json';
import { ChainLinkState } from '../../lib/chainlink';

export class RedstoneSubscriber<State> extends PartialEventSubscriber<
  State,
  ChainLinkState
> {
  static readonly proxyInterface = new Interface(ProxyABI);
  // static readonly ANSWER_UPDATED_TOPIC =
  //     RedstoneSubscriber.proxyInterface.getEventTopic('');

  constructor(
    private proxy: Address,
    private aggregator: Address,
    lens: Lens<DeepReadonly<State>, DeepReadonly<ChainLinkState>>,
    logger: Logger,
  ) {
    super([aggregator], lens, logger);
  }

  static getReadAggregatorMultiCallInput(proxy: Address): MultiCallInput {
    return {
      target: proxy,
      callData: RedstoneSubscriber.proxyInterface.encodeFunctionData(
        'getPriceFeedAdapter',
      ),
    };
  }

  static readAggregator(multicallOutput: MultiCallOutput): Address {
    return RedstoneSubscriber.proxyInterface.decodeFunctionResult(
      'getPriceFeedAdapter',
      multicallOutput,
    )[0];
  }

  static getReadDecimal(proxy: Address): MultiCallInput {
    return {
      target: proxy,
      callData:
        RedstoneSubscriber.proxyInterface.encodeFunctionData('decimals'),
    };
  }

  static readDecimals(multicallOutput: MultiCallOutput): Address {
    return RedstoneSubscriber.proxyInterface.decodeFunctionResult(
      'decimals',
      multicallOutput,
    )[0];
  }

  public processLog(
    state: DeepReadonly<ChainLinkState>,
    log: Readonly<Log>,
    blockHeader: Readonly<BlockHeader>,
  ): DeepReadonly<ChainLinkState> | null {
    // No events with updated info, this is placeholder
    return {
      answer: BigInt('1000000'),
      timestamp: BigInt('1000000'),
    };
  }

  public getGenerateStateMultiCallInputs(): MultiCallInput[] {
    return [
      {
        target: this.proxy,
        callData:
          RedstoneSubscriber.proxyInterface.encodeFunctionData(
            'latestRoundData',
          ),
      },
    ];
  }

  public generateState(
    multicallOutputs: MultiCallOutput[],
    blockNumber?: number | 'latest',
  ): DeepReadonly<ChainLinkState> {
    const decoded = RedstoneSubscriber.proxyInterface.decodeFunctionResult(
      'latestRoundData',
      multicallOutputs[0],
    );
    return {
      answer: BigInt(decoded.answer.toString()),
      timestamp: BigInt(decoded.updatedAt.toString()),
    };
  }

  public getLatestRoundData(state: DeepReadonly<State>): bigint {
    return this.lens.get()(state).answer;
  }
}
