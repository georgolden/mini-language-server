import { Test } from '@nestjs/testing';
import { CustomLogger } from './logger.service.js';
import { Logger } from '@nestjs/common';

describe('CustomLogger', () => {
  let logger: CustomLogger;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CustomLogger],
    }).compile();

    logger = await module.resolve<CustomLogger>(CustomLogger);
  });

  it('should inject format string messages into objects', () => {
    const superLog = jest.spyOn(Logger.prototype, 'log');

    logger.log('test message');
    expect(superLog).toHaveBeenCalledWith(
      { message: 'test message' },
      'Application',
    );
  });

  it('should pass through object messages', () => {
    const superLog = jest.spyOn(Logger.prototype, 'log');
    const logObject = {
      message: 'test message',
      data: { foo: 'bar' },
    };

    logger.log(logObject);
    expect(superLog).toHaveBeenCalledWith(logObject, 'Application');
  });
});
