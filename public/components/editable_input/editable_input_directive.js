import tpl from './editable_input.html';
import angular from 'angular';

function editableInputDirective() {

  return {
    restrict: 'E',
    replace: true,
    template: tpl,
    scope: {
      model: '=',
      type: '@?',
      onSave: '&',
      prefix: '@?',
      suffix: '@?',
      settings: '=?',
    },
    link: (scope) => {

      //range for due date
      if( scope.settings && scope.settings.select )
        scope.range = _.range(1, 29);

      scope.hover = scope.hover || false;
      scope.view = true;
      scope.obj = {
        copy: angular.copy(scope.model)
      };

      scope.toggleEdit = () => {
        scope.obj.copy = angular.copy(scope.model);
        scope.view = false;
      };

      scope.save = () => {
        scope.view = true;
        scope.model = scope.obj.copy;

        if (scope.onSave)
          scope.onSave();
      };

      scope.cancel = () => {
        scope.view = true;
      };


      scope.hoverView = () => {
        scope.hover = true;
      };

      scope.endHoverView = () => {
        scope.hover = false;
      };

    }
  };

}

export default editableInputDirective;
