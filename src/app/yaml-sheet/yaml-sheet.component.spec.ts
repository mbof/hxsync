import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YamlSheetComponent } from './yaml-sheet.component';

describe('YamlSheetComponent', () => {
  let component: YamlSheetComponent;
  let fixture: ComponentFixture<YamlSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YamlSheetComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(YamlSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
