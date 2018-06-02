const fs = require("fs-extra");

const Method = require('./method')

function Endpoint(dom, desc) {
  this.dom = dom;
  this.desc = desc;
  this.name = dom.window.document.body.children[0].children[0].getAttribute('api-name');
  this.id = dom.window.document.body.children[0].children[0].id.replace(/^resource_/, '');

  this.methods = null;

  this._allDtos = null;

  this._compile();
}

Endpoint.prototype._compile = function() {
  console.log(this.name);

  let dtosDir = this.name + '/dtos/';
  let methodsDir = this.name + '/methods/';

  let dirs = [ dtosDir, methodsDir ];

  let methodEls = this.dom.window.document.getElementsByClassName('operation');
  this.methods = Array.from(methodEls)
    .map(methodEl => new Method(this, methodEl));
  // Write dto files.
  let methodDtos = this.methods
    .map(method => method.dtos);

  // Read dtos, check for conflicts.
  let allDtos = {};
  for (let dtoList of methodDtos) {
    for (let dto of dtoList) {
      let existing = allDtos[dto.name];
      if (existing) {
        if (dto.isSubset(existing))
          continue;
        if (existing.isSubset(dto))
          allDtos[dto.name] = dto
        else {
          console.error('  CONFLICTING DTO: ' + dto.name);
          console.error('existing', existing, 'new', dto);
        }
        continue;
      }
      allDtos[dto.name] = dto;
    }
  }
  this._allDtos = allDtos;
};

Endpoint.prototype.get_dtos = function() {
  return Object.values(this._allDtos);
};

Endpoint.prototype.list_missing_dtos = function() {
  return Object.values(this._allDtos)
    .flatMap(dto => Object.values(dto.properties))
    .map(prop => prop.$ref)
    .filter(ref => ref)
    .map(ref => ref.split('.').pop())
    .filter(name => !this._allDtos[name])
    .forEach(console.log);
};

module.exports = Endpoint;
