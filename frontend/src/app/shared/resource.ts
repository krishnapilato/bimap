import { computed, ResourceRef, Signal } from '@angular/core';

export function listOf<T>(resource: ResourceRef<T[] | undefined>): Signal<T[]> {
  return computed(() => (resource.hasValue() ? resource.value() : []));
}
