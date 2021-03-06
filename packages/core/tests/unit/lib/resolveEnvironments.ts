import { mockImport } from '@theintern-dev/test-util';
import { NormalizedEnvironment } from '@theintern/digdug/dist/types';
import { sep } from 'path';

import Environment from 'src/lib/Environment';
import _resolveEnvironments, {
  EnvironmentOptions
} from 'src/lib/resolveEnvironments';

let resolveEnvironments: typeof _resolveEnvironments;

const createDescriptor = (
  browserName: string,
  platform: string,
  version: string
) => ({
  browserName,
  descriptor: {},
  platform,
  version,
  intern: { browserName, platform, version }
});

const availableChrome: NormalizedEnvironment[] = [
  createDescriptor('chrome', 'windows', '72'),
  createDescriptor('chrome', 'windows', '71'),
  createDescriptor('chrome', 'windows', '70'),
  createDescriptor('chrome', 'windows', '69'),
  createDescriptor('chrome', 'windows', 'alpha'),
  createDescriptor('chrome', 'windows', 'beta'),
  createDescriptor('chrome', 'windows', 'dev'),
  createDescriptor('chrome', 'windows', 'alpha'),
  createDescriptor('chrome', 'mac', '72'),
  createDescriptor('chrome', 'mac', '71'),
  createDescriptor('chrome', 'mac', '70'),
  createDescriptor('chrome', 'mac', '69')
];

const availableIe: NormalizedEnvironment[] = [
  createDescriptor('ie', 'windows', '11'),
  createDescriptor('ie', 'windows', '10')
];

const available: NormalizedEnvironment[] = [...availableChrome, ...availableIe];

function assertResolve(
  capabilities: { [key: string]: any },
  environments: EnvironmentOptions[],
  available?: NormalizedEnvironment[],
  expected?: any,
  message?: string
) {
  const actual = resolveEnvironments(capabilities, environments, available);
  assert.deepEqual(
    actual,
    expected.map((expected: any) => new Environment(expected)),
    message
  );
}

function assertResolveEnvironments(
  environments: EnvironmentOptions[],
  available: NormalizedEnvironment[],
  expected: any,
  message?: string
) {
  assertResolve({}, environments, available, expected, message);
}

registerSuite('lib/resolveEnvironments', {
  async before() {
    ({ default: resolveEnvironments } = await mockImport(
      () => import('src/lib/resolveEnvironments'),
      replace => {
        replace(() => import('src/lib/node/process')).withDefault({
          cwd: () => (sep === '/' ? '/foo' : 'C:\\foo')
        } as NodeJS.Process);
      }
    ));
  },

  tests: {
    'no version, is passed through'() {
      const environments = <EnvironmentOptions[]>[
        { browserName: 'chrome', platformVersion: '10' }
      ];
      assertResolveEnvironments(environments, availableChrome, environments);
    },

    'numeric version, is passed through'() {
      const environments = <EnvironmentOptions[]>[
        { browserName: 'chrome', version: 39, platformVersion: '10' }
      ];
      assertResolveEnvironments(environments, availableChrome, [
        {
          ...environments[0],
          browserVersion: environments[0].version
        }
      ]);
    },

    permutations: (function () {
      const base = { platformName: 'windows', platformVersion: 8 };

      return {
        'just a base; returns an empty list'() {
          assertResolve(
            base,
            [],
            available,
            [base],
            'Permuting only the base should return 1 result'
          );
        },

        'single source without permutations; returns base + source'() {
          const sources = [{ browserName: 'chrome', browserVersion: 'latest' }];
          const expected = [
            {
              browserName: 'chrome',
              browserVersion: availableChrome[0].version,
              platformName: 'windows',
              platformVersion: 8,
              version: availableChrome[0].version
            }
          ];
          assertResolve(
            base,
            sources,
            available,
            expected,
            'their contents should be equal'
          );
        },

        'single source overriding base property'() {
          const sources = [{ browserName: 'chrome', platformName: 'linux' }];
          const expected = [
            {
              browserName: 'chrome',
              platformName: 'linux',
              platformVersion: 8
            }
          ];
          assertResolve(
            base,
            sources,
            available,
            expected,
            'their contents should be equal'
          );
        },

        'single permutation (n); returns n * (base + source)'() {
          const sources = [
            {
              browserName: 'chrome',
              browserVersion: ['latest', 'latest-1']
            }
          ];
          const expected = [
            {
              browserName: 'chrome',
              browserVersion: availableChrome[0].version,
              platformName: 'windows',
              platformVersion: 8,
              version: availableChrome[0].version
            },
            {
              browserName: 'chrome',
              browserVersion: availableChrome[1].version,
              platformName: 'windows',
              platformVersion: 8,
              version: availableChrome[1].version
            }
          ];
          assertResolve(
            base,
            sources,
            available,
            expected,
            'their contents should be equal'
          );
        },

        'multiple permutations (n, m); returns n * m * (base + source)'() {
          const sources = [
            {
              browserName: ['chrome', 'ie'],
              browserVersion: ['latest', 'latest-1']
            }
          ];
          const expected = [
            {
              browserName: 'chrome',
              browserVersion: availableChrome[0].version,
              version: availableChrome[0].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'ie',
              browserVersion: availableIe[0].version,
              version: availableIe[0].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'chrome',
              browserVersion: availableChrome[1].version,
              version: availableChrome[1].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'ie',
              browserVersion: availableIe[1].version,
              version: availableIe[1].version,
              platformName: 'windows',
              platformVersion: 8
            }
          ];
          assertResolve(
            base,
            sources,
            available,
            expected,
            'their contents should be equal'
          );
        },

        'multiple sources (s), single permutation; returns all sources mixed into base'() {
          const sources = [
            {
              browserName: 'chrome',
              browserVersion: ['latest', 'latest-1']
            },
            {
              browserName: 'ie',
              browserVersion: ['latest', 'latest-1']
            }
          ];
          const expected = [
            {
              browserName: 'chrome',
              browserVersion: availableChrome[0].version,
              version: availableChrome[0].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'chrome',
              browserVersion: availableChrome[1].version,
              version: availableChrome[1].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'ie',
              browserVersion: availableIe[0].version,
              version: availableIe[0].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'ie',
              browserVersion: availableIe[1].version,
              version: availableIe[1].version,
              platformName: 'windows',
              platformVersion: 8
            }
          ];
          assertResolve(
            base,
            sources,
            available,
            expected,
            'their contents should be equal'
          );
        },

        'multiple sources (s), multiple permutations (n, m); returns s * n * m permutations'() {
          const sources = [
            {
              browserName: 'chrome',
              browserVersion: ['latest', 'latest-1'],
              platformName: ['windows', 'mac']
            },
            {
              browserName: 'ie',
              browserVersion: ['latest', 'latest-1']
            }
          ];
          const expected = [
            {
              browserName: 'chrome',
              browserVersion: availableChrome[0].version,
              version: availableChrome[0].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'chrome',
              browserVersion: availableChrome[1].version,
              version: availableChrome[1].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'chrome',
              browserVersion: availableChrome[0].version,
              version: availableChrome[0].version,
              platformName: 'mac',
              platformVersion: 8
            },
            {
              browserName: 'chrome',
              browserVersion: availableChrome[1].version,
              version: availableChrome[1].version,
              platformName: 'mac',
              platformVersion: 8
            },
            {
              browserName: 'ie',
              browserVersion: availableIe[0].version,
              version: availableIe[0].version,
              platformName: 'windows',
              platformVersion: 8
            },
            {
              browserName: 'ie',
              browserVersion: availableIe[1].version,
              version: availableIe[1].version,
              platformName: 'windows',
              platformVersion: 8
            }
          ];
          assertResolve(
            base,
            sources,
            available,
            expected,
            'their contents should be equal'
          );
        },

        'multiple everything'() {
          const base = { isCapabilities: true };
          const sources = [
            {
              browserName: ['a', 'b'],
              version: ['1', '2'],
              platform: ['c', 'd'],
              platformVersion: ['3', '4']
            }
          ];
          const expected = [
            {
              browserName: 'a',
              version: '1',
              browserVersion: '1',
              platform: 'c',
              platformVersion: '3',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '1',
              browserVersion: '1',
              platform: 'c',
              platformVersion: '3',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '2',
              browserVersion: '2',
              platform: 'c',
              platformVersion: '3',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '2',
              browserVersion: '2',
              platform: 'c',
              platformVersion: '3',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '1',
              browserVersion: '1',
              platform: 'd',
              platformVersion: '3',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '1',
              browserVersion: '1',
              platform: 'd',
              platformVersion: '3',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '2',
              browserVersion: '2',
              platform: 'd',
              platformVersion: '3',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '2',
              browserVersion: '2',
              platform: 'd',
              platformVersion: '3',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '1',
              browserVersion: '1',
              platform: 'c',
              platformVersion: '4',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '1',
              browserVersion: '1',
              platform: 'c',
              platformVersion: '4',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '2',
              browserVersion: '2',
              platform: 'c',
              platformVersion: '4',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '2',
              browserVersion: '2',
              platform: 'c',
              platformVersion: '4',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '1',
              browserVersion: '1',
              platform: 'd',
              platformVersion: '4',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '1',
              browserVersion: '1',
              platform: 'd',
              platformVersion: '4',
              isCapabilities: true
            },

            {
              browserName: 'a',
              version: '2',
              browserVersion: '2',
              platform: 'd',
              platformVersion: '4',
              isCapabilities: true
            },
            {
              browserName: 'b',
              version: '2',
              browserVersion: '2',
              platform: 'd',
              platformVersion: '4',
              isCapabilities: true
            }
          ];
          assertResolve(
            base,
            sources,
            undefined,
            expected,
            'their contents should be equal'
          );
        }
      };
    })(),

    'version aliases': {
      'latest version alias'() {
        const environments = [{ browserName: 'chrome', version: 'latest' }];
        const expected = [
          { browserName: 'chrome', browserVersion: '72', version: '72' }
        ];
        return assertResolveEnvironments(
          environments,
          availableChrome,
          expected
        );
      },

      'latest-1 version alias'() {
        const environments = [{ browserName: 'chrome', version: 'latest-1' }];
        const expected = [
          { browserName: 'chrome', browserVersion: '71', version: '71' }
        ];
        return assertResolveEnvironments(
          environments,
          availableChrome,
          expected
        );
      }
    },

    'version ranges': {
      'basic version range'() {
        const environments = [{ browserName: 'chrome', version: '71..72' }];
        const expected = [
          { browserName: 'chrome', browserVersion: '71', version: '71' },
          { browserName: 'chrome', browserVersion: '72', version: '72' }
        ];
        return assertResolveEnvironments(
          environments,
          availableChrome,
          expected
        );
      },

      'ranged number .. latest'() {
        const environments = [{ browserName: 'chrome', version: '70..latest' }];
        const expected = [
          { browserName: 'chrome', browserVersion: '70', version: '70' },
          { browserName: 'chrome', browserVersion: '71', version: '71' },
          { browserName: 'chrome', browserVersion: '72', version: '72' }
        ];
        return assertResolveEnvironments(
          environments,
          availableChrome,
          expected
        );
      },

      'ranged math latest-2..latest'() {
        const environments = [
          { browserName: 'chrome', version: 'latest-2..latest' }
        ];
        const expected = [
          { browserName: 'chrome', browserVersion: '70', version: '70' },
          { browserName: 'chrome', browserVersion: '71', version: '71' },
          { browserName: 'chrome', browserVersion: '72', version: '72' }
        ];
        return assertResolveEnvironments(
          environments,
          availableChrome,
          expected
        );
      },

      'ranged math latest-1..latest with multiple browsers'() {
        const available: NormalizedEnvironment[] = availableChrome.concat(
          availableIe
        );
        const environments = [
          { browserName: ['chrome', 'ie'], version: 'latest-1..latest' }
        ];
        const expected = [
          { browserName: 'chrome', browserVersion: '71', version: '71' },
          { browserName: 'chrome', browserVersion: '72', version: '72' },
          { browserName: 'ie', browserVersion: '10', version: '10' },
          { browserName: 'ie', browserVersion: '11', version: '11' }
        ];
        return assertResolveEnvironments(environments, available, expected);
      },

      'ranged math out of bounds; throws'() {
        const environments = [{ browserName: 'ie', version: '3..latest' }];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableIe);
        });
      }
    },

    'does not filter on properties not present in available environments'() {
      const environments = [
        {
          browserName: 'chrome',
          version: 'latest',
          // not present in available environments
          platformName: 'os2/warp',
          // not present in available environments
          platformVersion: 10
        }
      ];
      const expected = [
        {
          browserName: 'chrome',
          browserVersion: '72',
          version: '72',
          platformName: 'os2/warp',
          platformVersion: 10
        }
      ];
      return assertResolveEnvironments(environments, availableChrome, expected);
    },

    'invalid range syntax': {
      'multiple ranges'() {
        const environments = [
          { browserName: 'ie', version: 'latest-2..latest-1..latest' }
        ];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableIe);
        }, /Invalid version syntax/);
      },

      'non-numeric offset'() {
        const environments = [{ browserName: 'ie', version: '10..latest-a' }];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableIe);
        }, /Invalid alias syntax/);
      },

      'backwards ranges'() {
        const environments = [
          { browserName: 'chrome', version: 'latest..latest-2' }
        ];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableChrome);
        }, /Invalid range/);
      },

      'offset too large'() {
        const environments = [{ browserName: 'chrome', version: 'latest-12' }];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableChrome);
        }, /versions are available/);
      },

      'range unavailable'() {
        const environments = [{ browserName: 'chrome', version: '1..3' }];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableChrome);
        }, /The version range .* is unavailable/);
      },

      'extra minuses'() {
        const environments = [{ browserName: 'chrome', version: 'latest-2-3' }];
        assert.throws(function () {
          resolveEnvironments({}, environments, availableChrome);
        }, /Invalid alias syntax/);
      }
    },

    'pwd expansion'() {
      const environments = {
        browserName: 'chrome',
        chromeOptions: {
          binary: '{pwd}/node_modules/electron/dist/electron.exe',
          args: ['app={pwd}/build/bootstrap.js']
        }
      };
      const expected = {
        browserName: 'chrome',
        chromeOptions: {
          binary:
            sep === '/'
              ? '/foo/node_modules/electron/dist/electron.exe'
              : 'C:\\foo\\node_modules\\electron\\dist\\electron.exe',
          args: [
            sep === '/'
              ? 'app=/foo/build/bootstrap.js'
              : 'app=C:\\foo\\build\\bootstrap.js'
          ]
        }
      };

      const resolved = resolveEnvironments({}, [environments]);
      assert.equal(
        JSON.stringify(resolved[0], null, '  '),
        JSON.stringify(expected, null, '  ')
      );
    }
  }
});
