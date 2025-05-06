import { firstValueFrom } from 'rxjs';
import { DatConfigProtocol } from './config-protocol';
import { ConfigSession, DeviceTaskState } from './config-session';
import { DevicemgrService } from './devicemgr.service';
import { createMockDat } from './devicemgr.service.spec';
import { DEVICE_CONFIGS } from './config-modules/device-configs';

describe('ConfigSession', () => {
  const datFile = createMockDat('HX890');
  const configSession: ConfigSession = new ConfigSession(
    new DatConfigProtocol(datFile)
  );

  it('fails when trying to save malformed YAML', async () => {
    configSession.reset(
      DEVICE_CONFIGS.get('HX890')!,
      new DatConfigProtocol(datFile)
    );
    const invalidYaml = `
- invalid_yaml:
    - key: value
     - key2: value2
    - key3: value3
    - key4: value4
`;
    configSession._deviceTaskState.next('yaml-edit');
    await configSession.saveYaml(invalidYaml);
    const yamlError = await firstValueFrom(configSession.yamlError$);
    expect(yamlError?.msg).toEqual(
      `YAML parse error: BAD_INDENT All sequence items must start at the same column at line 4, column 6:

    - key: value
     - key2: value2
     ^
`
    );
    expect(yamlError?.range).toEqual([39, 40]);
  });
});
