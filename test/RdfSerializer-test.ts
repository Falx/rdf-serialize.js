const quad = require('rdf-quad');
const prefix = require('rdf-quad');
const streamifyArray = require('streamify-array');
const stringifyStream = require('stream-to-string');
import { RdfSerializer } from "../lib/RdfSerializer";

import serializer from "..";

describe('serializer', () => {
  it('should be an RdfSerializer instance', () => {
    expect(serializer).toBeInstanceOf(RdfSerializer);
  });

  it('should get all content types', async () => {
    expect((await serializer.getContentTypes()).sort()).toEqual([
      "application/ld+json",
      "application/trig",
      "application/n-quads",
      "text/turtle",
      "application/n-triples",
      "text/n3"
    ].sort());
  });

  it('should get all prioritized content types', async () => {
    expect(await serializer.getContentTypesPrioritized()).toEqual({
      "application/n-quads": 1,
      "application/trig": 0.95,
      "application/ld+json": 0.9,
      "application/n-triples": 0.8,
      "text/turtle": 0.6,
      "text/n3": 0.35
    });
  });

  it('should fail to serialize without content type and path', () => {
    const stream = streamifyArray([]);
    return expect(() => serializer.serialize(stream, <any>{}))
      .toThrow(new Error('Missing \'contentType\' or \'path\' option while serializing.'));
  });

  it('should fail to serialize with path without extension', () => {
    const stream = streamifyArray([]);
    return expect(() => serializer.serialize(stream, { path: 'abc' }))
      .toThrow(new Error('No valid extension could be detected from the given \'path\' option: \'abc\''));
  });

  it('should fail to serialize with path with unknown extension', () => {
    const stream = streamifyArray([]);
    return expect(() => serializer.serialize(stream, { path: 'abc.unknown' }))
      .toThrow(new Error('No valid extension could be detected from the given \'path\' option: \'abc.unknown\''));
  });

  it('should serialize text/turtle', () => {
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
      quad('http://two.ex.org/s', 'http://two.ex.org/p', 'http://two.ex.org/o2'),
    ]);
    return expect(stringifyStream(serializer.serialize(stream, { contentType: 'text/turtle', prefixes: { ex: 'http://ex.org/' } })))
      .resolves.toEqual(`<http://ex.org/s> <http://ex.org/p> <http://ex.org/o1>, <http://ex.org/o2>.
<http://two.ex.org/s> <http://two.ex.org/p> <http://two.ex.org/o2>.
`);
  });

  it.only('should serialize text/turtle with prefixes', () => {
    const prefixes = {
      ex: 'http://ex.org/',
      two: 'http://two.ex.org/'
    };
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
      quad('http://two.ex.org/s', 'http://two.ex.org/p', 'http://two.ex.org/o1'),
    ]);
    return expect(stringifyStream(serializer.serialize(stream, { contentType: 'text/turtle', prefixes })))
      .resolves.toEqual(`ex:s ex:p ex:o1, ex:o2.

two:s two:p two:o1.
`);
  });

  it('should serialize text/turtle with an empty prefixes', () => {
    const prefixes = {
      ['']: 'http://ex.org/'
    };
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
    ]);
    return expect(stringifyStream(serializer.serialize(stream, { contentType: 'text/turtle', prefixes })))
      .resolves.toEqual(`:s :p :o1, :o2.`);
  });

  it('should serialize text/turtle with base', () => {
    const base = 'http://ex.org/';
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
    ]);
    return expect(stringifyStream(serializer.serialize(stream, { contentType: 'text/turtle', base })))
      .resolves.toEqual(`<s> <p> <o1>, <o2>.`);
  });
  
  it('should serialize text/turtle with base and prefixes', () => {
    const base = 'http://ex.org/';
    const prefixes = {
      a: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      p: 'path/'
    }
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
      quad('http://ex.org/path/s', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://ex.org/path/o2'),
    ]);
    return expect(stringifyStream(serializer.serialize(stream, { contentType: 'text/turtle', base, prefixes })))
      .resolves.toEqual(
        `<s> <p> <o1>, <o2>.
         p:s a p:o2`);
  });

  it('should serialize application/ld+json', () => {
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
    ]);
    return expect(stringifyStream(serializer.serialize(stream, { contentType: 'application/ld+json' })))
      .resolves.toEqual(`[
  {
    "@id": "http://ex.org/s",
    "http://ex.org/p": [
      {
        "@id": "http://ex.org/o1"
      }
      ,
      {
        "@id": "http://ex.org/o2"
      }
    ]
  }
]
`);
  });

  it('should serialize application/ld+json by path', () => {
    const stream = streamifyArray([
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
      quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
    ]);
    return expect(stringifyStream(serializer
      .serialize(stream, { path: 'myfile.json' })))
      .resolves.toEqual(`[
  {
    "@id": "http://ex.org/s",
    "http://ex.org/p": [
      {
        "@id": "http://ex.org/o1"
      }
      ,
      {
        "@id": "http://ex.org/o2"
      }
    ]
  }
]
`);
  });
});
