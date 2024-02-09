import { parseHeader, Locus, makeParser, parseWaypoint } from './gps';
import { unhex } from './message';

describe('parseHeader', () => {
  it('should build a full header', () => {
    const header = parseHeader(unhex('0100010B7F0000000500000000007A0B'), true);
    expect(header).toBeTruthy();
    expect(header.intervalSetting).toBe(5);
    expect(header.logContent).toBe(0x7f);
    expect(header.loggingType).toBe(1);
    expect(header.loggingMode).toBe(11);
  });
  it('should reject an invalid header', () => {
    const header = () => parseHeader(unhex('0100010B7F0000000500000000007AFF'), true);
    expect(header).toThrow();
  });
});

describe('parseWaypoint', () => {
  it('should parse a waypoint', () => {
    const parser = makeParser(0x7f);
    const waypoint = parseWaypoint(parser, unhex('0992245D02200952422861574130000D0027019D'), true);
    expect(waypoint.utc).toBe(1562677769);
    expect(waypoint.valid).toBe(2);
    expect(waypoint.lat).toBeCloseTo(52.50891);
    expect(waypoint.lon).toBeCloseTo(13.46122);
    expect(waypoint.hgt).toBe(48);
    expect(waypoint.spd).toBe(13);
    expect(waypoint.trk).toBe(295);
  });
  it('should reject a bad waypoint', () => {
    const parser = makeParser(0x7f);
    const waypoint = () => parseWaypoint(parser, unhex('0992245D02200952422861574130000D00270188'), true);
    expect(waypoint).toThrow();
  });
});

describe('Locus', () => {
  it('should parse a log file', () => {
    const data_str =
      '0100010b7f0000000500000000007a0b0000000000000000000000000000000f' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffff00fc8c1c' +
      '0992245d02200952422861574130000d0027019d0e92245d0246095242715d57' +
      '412e000a001e01b91392245d021e095242715b574128000600da00351892245d' +
      '02a70852421f5a574124000c00c900fc1d92245d023f08524276595741240007' +
      '00c3000a2292245d02b70752428158574125000c00c6004b2792245d02380752' +
      '42ae57574124000900c200e12c92245d02080752426b57574124000000c30017' +
      '3192245d02080752427e57574123000000c300183692245d02080752427e5757' +
      '4123000000c3001f3b92245d02080752427e57574123000000c300124092245d' +
      '02080752427e57574123000000c300694592245d02e306524238575741230004' +
      '00c600c14a92245d027e065242b856574124000900c400da4f92245d020c0652' +
      '42e355574123000a00c400f15492245d028b055242e554574124000b00c4006f' +
      '5992245d020f055242f953574125000a00c500fc5e92245d02910452420e5357' +
      '4124000b00c500936392245d020c0452420a52574123000c00c300306892245d' +
      '027f035242f350574121000c00c400b16d92245d02f8025242d54f57411f000b' +
      '00c500337292245d027f025242e54e57411e000a00c4009b7792245d02090252' +
      '42b04d57411d000a00cb00b27c92245d029f0152427b4c57411d000900cc00e2' +
      '8192245d023e015242724b57411c000800c900b58692245d02de0052426b4a57' +
      '411d000800cf004c8b92245d0293005242cd4957411d000200cd00a19092245d' +
      '0291005242fd4957411e000000cc00889592245d0291005242004a57411e0000' +
      '00cc00739a92245d0291005242004a57411e000000cc007c9f92245d02910052' +
      '42004a57411e000000cc0079a492245d0291005242004a57411e000000cc0042' +
      'a992245d0291005242004a57411e000000cc004fae92245d0291005242ff4957' +
      '411e000100cc00b5b392245d026e0052425d4957411f000500f800c4b892245d' +
      '02a6005242724657411f000f002a01febd92245d02f60052424a4257411e000e' +
      '0027019ac292245d023c0152421b3e57411d000e00250102c792245d027e0152' +
      '42fd3957411c000e002601a6cc92245d02c4015242053657411a000e002601e6' +
      'd192245d0208025242fc3157411a000e002701cbd692245d024d025242002e57' +
      '4119000c0026016adb92245d027b0252427c2b574119000700260123e092245d' +
      '02a9025242152957411a0008002b01a0e592245d02bc025242e4275741190002' +
      '00240149ea92245d02c402524277275741180000002801a2ef92245d02ca0252' +
      '428627574118000000280158f492245d02db02524239275741180003006601a0' +
      'f992245d02480352426f28574118000c00190017fe92245d02e2035242622a57' +
      '4117000b001900bd0393245d025d045242b52b5741170008001400210893245d' +
      '02bc045242ae2c5741180007001700d40d93245d02fa0452425e2d5741180003' +
      '001600631293245d0216055242cd2d57411a00000018000d1793245d02130552' +
      '42d22d57411b0000001800131c93245d0213055242d22d57411b000000180018' +
      '2193245d0213055242d22d57411b0000001800252693245d0213055242d22d57' +
      '411b0000001800222b93245d0219055242f22d57411b0002002900363093245d' +
      '0279055242e82e57411b000a000a007f3593245d0207065242343057411a000d' +
      '001800d13a93245d0299065242ad3157411a000b001700d13f93245d020b0752' +
      '42be3257411a0009001400564493245d02600752429733574118000500140060' +
      '4993245d0278075242c6335741190000001600224e93245d0280075242d83357' +
      '41190003001800ce5393245d02d40752423d35574119000a002100545893245d' +
      '023f08524263365741170008001400df5d93245d02b40852428f37574117000c' +
      '001400b86293245d0249095242c938574118000c001100386793245d02d00952' +
      '42c239574119000b000e00b76c93245d02450a5242653a5741190009000b0089' +
      '7193245d028a0a5242ae3a57411a0004000500907693245d02a50a5242cc3a57' +
      '411b0002000b00d37b93245d02f00a52423a3b57411d00090011006b8093245d' +
      '02740b52421e3c57411e000b000c002a8593245d02e40b5242073d57411f0007' +
      '000f00a98a93245d02280c5242993d5741210004000d00cc8f93245d025a0c52' +
      '42ff3d5741220004000c00df9493245d02c00c5242b33e5741230009000c001d' +
      '9993245d02490d52429a3f574123000c000d00b49e93245d02ec0d5242c94057' +
      '4123000d000c003aa393245d02610e524284415741240009000d00c7a893245d' +
      '02770e524296425741280007006000a4ad93245d02400e5242b14557412d000b' +
      '007200adb293245d02f60d52425a49574131000d007600feb793245d02a40d52' +
      '423e4d574135000e007700cfbc93245d024c0d52425251574138000e00770051' +
      'c193245d02150d5242b454574136000c0066008bc693245d02f20c52422e5857' +
      '4136000a006900f5cb93245d02cc0c52427f5b574136000e00690090d093245d' +
      '029f0c5242d75f574138000e0068007bd593245d02610c5242e863574139000e' +
      '007b0091da93245d02ff0b5242526757413a000d007d00bfdf93245d02830b52' +
      '42a969574138000c009800d5e493245d021b0b5242e06a5741350003008e0028' +
      'e993245d02180b5242296b5741320000008e00eaee93245d02180b52422e6b57' +
      '41320000008e00eaf393245d02170b5242366b5741320000008e00e0f893245d' +
      '02170b5242396b5741320000008e00e4fd93245d02170b5242396b5741320000' +
      '008e00e10294245d020c0b5242616b5741320006009600440794245d028b0a52' +
      '42646d5741320010009500d10c94245d02e609524231705741320010008d00e4' +
      '1194245d024e0952423d73574131000e008e00401694245d02d7085242af7557' +
      '4130000b008c004d1b94245d0279085242b97757412f000a008c00e42094245d' +
      '0224085242c47957412e000a008a00f62594245d02c2075242c07b57412d000a' +
      '008d00182a94245d02720752425e7d57412a0006008b00322f94245d023b0752' +
      '42c67e5741280005008700e83494245d0210075242797f574127000700940078' +
      '3994245d02da06524278815741260006008a005f3e94245d02bb065242ad8257' +
      '41260000006f000c4394245d02b8065242c1825741260000006f001e4894245d' +
      '02b8065242c1825741260000006f00154d94245d02b8065242c1825741260000' +
      '006f00105294245d02b8065242c1825741260000006f000f5794245d02b70652' +
      '42cc825741260000006f00085c94245d02b7065242d0825741260000006f001f' +
      '6194245d02b7065242db825741260000006f00296694245d02b7065242df8257' +
      '41260000006f002a6b94245d02b7065242df825741260000006f00277094245d' +
      '02b7065242df825741260000006f003cffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const locus = new Locus(unhex(data_str), true);
    expect(locus).toBeTruthy();
    expect(locus.getGpx()).toMatch(/.*<wpt lat="52.5089111328125" lon="13.461219787597656">.*/);
  });
});
