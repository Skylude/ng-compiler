import { ComponentFactory, ComponentRef, Injectable, ViewChild, ViewContainerRef, ViewRef, EmbeddedViewRef } from '@angular/core';
import { CompilerConfig, AotCompiler, JitCompiler, templateJitUrl, ngModuleJitUrl, sharedStylesheetJitUrl, splitClasses, splitNsName, createAotCompiler, createAotUrlResolver, core } from '@angular/compiler';
import { Http } from '@angular/http';
import { Observable, Observer } from 'rxjs';
import { map } from 'rxjs/operators';


import { CompiledResultModel } from './compiled-result.model';
import { Compiler } from './compiler';
import { DynamicTypeBuilder, DynamicComponent } from './dynamic-type.builder';

@Injectable()
export class TemplateCompiler implements Compiler {

    protected componentRef: ComponentRef<DynamicComponent>;

    // @ViewChild('dynamicContentPlaceHolder', { read: ViewContainerRef })
    // protected dynamicComponentTarget: ViewContainerRef;

    constructor(
        protected http: Http, protected typeBuilder: DynamicTypeBuilder
    ) { }

    compile(url: string, model: any = {}, target: ViewContainerRef, additionalImports?: any[]): Observable<CompiledResultModel> {
        return Observable.create((observer: Observer<any>) => {
            let styles: string[];

            this.http.get(url).pipe(map(response => response.text())).subscribe(result => {
                styles = result.match(/<\s*style((\s+[^<>]+\s*>)|(\s*>))[^<>]*<\s*\/style\s*>/g);
                result = result.replace(/<\s*style((\s+[^<>]+\s*>)|(\s*>))[^<>]*<\s*\/style\s*>/g, '');

                this.typeBuilder.createComponentFactoryByTemplate(result, additionalImports).then((factory: ComponentFactory<DynamicComponent>) => {
                    // Target will instantiate and inject component (we'll keep reference to it)
                    this.componentRef = target
                        .createComponent(factory);

                    // let's inject @Inputs to component instance
                    let component = this.componentRef.instance;
                    component.model = model;

                    this.componentRef.changeDetectorRef.detectChanges();

                    //let combinedStyles: string = styles.reduce((style) => style);

                    observer.next(new CompiledResultModel(this.componentRef, styles));
                    observer.complete();
                }, (err) => {
                    observer.error(err);
                    observer.complete();
                });

            }, (err) => {
                observer.error(err);
                observer.complete();
            });

        });
    }
}
