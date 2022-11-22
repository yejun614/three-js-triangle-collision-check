/*
 * Copyright (c) 2021 Prolincur Technologies LLP.
 * All Rights Reserved.
 */

import * as THREE from './three.module.js'

/**
 * Simple trick to load THREE.Geometry in older and newer versions of three
 * @returns
 */
const _safeGetExport = (three, exp) => {
  return three[exp]
}

/**
 * An utility to make traversal of triangular faces of {@link three.js} Mesh, Geometry or BufferGeometry easy.
 *
 * @author Sourabh Soni <Sourabh.Soni@prolincur.com>
 */
class ThreeTriangleIterator {
  constructor(object, forEachFace) {
    this.callback = forEachFace
    this.matrix = null
    if (object) this.iterate(object)
  }

  iterate = (object) => {
    const Geometry = _safeGetExport(THREE, 'Geometry')
    if (Geometry && object instanceof Geometry) {
      this.fromGeometry(object)
    } else if (object instanceof THREE.BufferGeometry) {
      if (object.index !== null) {
        this.fromIndexedBufferGeometry(object)
      } else {
        this.fromNonIndexedBufferGeometry(object)
      }
    } else if (object instanceof THREE.Mesh) {
      this.fromMesh(object)
    } else if (object instanceof THREE.Group) {
      const traverse = this.iterate
      object.children?.forEach((obj) => traverse(obj))
    } else {
      console.warn('three-triangle-iterator - skipping unsupported object type ' + object?.type)
    }
  }

  fromMesh = (mesh) => {
    const geometry = mesh.geometry
    mesh.updateMatrix()
    this.matrix = mesh.matrix.clone()
    this.iterate(geometry)
  }

  fromGeometry = (geometry) => {
    if (!this.matrix) this.matrix = THREE.Matrix4()

    const positions = geometry.faces
    const len = positions.length
    for (let i = 0; i < len; i++) {
      const polygon = []
      const face = geometry.faces[i]
      let vertex = geometry.vertices[face.a]
      vertex = new THREE.Vector3(vertex.x, vertex.y, vertex.z)
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      vertex = geometry.vertices[face.b]
      vertex = new THREE.Vector3(vertex.x, vertex.y, vertex.z)
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      vertex = geometry.vertices[face.c]
      vertex = new THREE.Vector3(vertex.x, vertex.y, vertex.z)
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      this.callback(polygon)
    }
  }

  fromNonIndexedBufferGeometry = (geometry) => {
    if (!this.matrix) this.matrix = new THREE.Matrix4()
    const positions = geometry.attributes.position.array
    const len = positions.length
    if (len % 9 !== 0) {
      console.warn(
        'three-triangle-iterator - skipping unsupported non-indexed buffer geometry of length ' +
          len
      )
      return
    }
    let i = -1
    let x, y, z, vertex
    while (i < len - 1) {
      const polygon = []

      x = positions[++i]
      y = positions[++i]
      z = positions[++i]
      vertex = new THREE.Vector3(x, y, z)
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      x = positions[++i]
      y = positions[++i]
      z = positions[++i]
      vertex = new THREE.Vector3(x, y, z)
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      x = positions[++i]
      y = positions[++i]
      z = positions[++i]
      vertex = new THREE.Vector3(x, y, z)
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      this.callback(polygon)
    }
  }

  fromIndexedBufferGeometry = (geometry) => {
    if (!this.matrix) this.matrix = THREE.Matrix4()
    const positions = geometry.attributes.position.array
    const indices = geometry.index.array
    const len = indices.length

    for (let i = 0; i < len; i += 3) {
      const polygon = []

      let index3 = indices[i] * 3
      let vertex = new THREE.Vector3(
        positions[index3],
        positions[index3 + 1],
        positions[index3 + 2]
      )
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      index3 = indices[i + 1] * 3
      vertex = new THREE.Vector3(positions[index3], positions[index3 + 1], positions[index3 + 2])
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      index3 = indices[i + 2] * 3
      vertex = new THREE.Vector3(positions[index3], positions[index3 + 1], positions[index3 + 2])
      vertex.applyMatrix4(this.matrix)
      polygon.push(vertex)

      this.callback(polygon)
    }
  }
}

/**
 * Iterates each geometry face of the object.
 * @param {object} object ThreeJS Mesh, Geometry, or BufferGeometry
 * @param {function} callback Callback function to visit each face
 * @author Sourabh Soni <Sourabh.Soni@prolincur.com>
 */
const forEachTriangle = (object, callback) => {
  return new ThreeTriangleIterator(object, callback)
}

export default forEachTriangle
